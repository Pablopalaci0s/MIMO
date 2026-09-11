import { AppError } from "@/lib/errors";

/**
 * Envoltorio fino sobre la REST API de PayPal (Orders v2 + Payouts v1).
 * MIMO cobra el total del carrito a su propia cuenta (no somos "Partner" de
 * PayPal, así que no hay split automático en el checkout — ver README,
 * "Diseño: pagos con PayPal") y después reparte manualmente con Payouts
 * cuando cada negocio confirma su parte (`payment-split-service.ts`).
 */

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE?.trim() || "https://api-m.sandbox.paypal.com";

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function requirePaypalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AppError(
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      "El pago con PayPal todavía no está configurado en el servidor.",
      503,
    );
  }
  return { clientId, clientSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) return cachedToken.value;

  const { clientId, clientSecret } = requirePaypalCredentials();
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) {
    throw new AppError("PAYPAL_AUTH_FAILED", "No pudimos autenticar con PayPal.", 502);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AppError(
      "PAYPAL_REQUEST_FAILED",
      (data as { message?: string } | null)?.message ?? "PayPal rechazó la operación.",
      502,
    );
  }
  return data as T;
}

/** Crea la orden en PayPal (todavía sin cobrar) para que el comprador la
 * apruebe con el botón de PayPal en el checkout. */
export async function createPaypalCheckoutOrder(totalAmount: number, currency = "USD"): Promise<string> {
  const data = await paypalFetch<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: currency, value: totalAmount.toFixed(2) } }],
    }),
  });
  return data.id;
}

interface PaypalCaptureResponse {
  status: string;
  purchase_units: { payments: { captures: { id: string; status: string; amount: { value: string } }[] } }[];
}

/** Cobra una orden ya aprobada por el comprador. Lanza si PayPal no
 * completó el cobro — nunca se debe crear un `Order` en MIMO sin esto. */
export async function capturePaypalOrder(paypalOrderId: string): Promise<{ captureId: string; amount: number }> {
  const data = await paypalFetch<PaypalCaptureResponse>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
  });
  const capture = data.purchase_units[0]?.payments.captures[0];
  if (data.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    throw new AppError("PAYMENT_FAILED", "PayPal no pudo completar el cobro.", 402);
  }
  return { captureId: capture.id, amount: Number(capture.amount.value) };
}

/** Reembolsa (total o parcialmente) una captura ya hecha — se usa cuando un
 * negocio del carrito multi-tienda no confirma su parte a tiempo. */
export async function refundPaypalCapture(
  captureId: string,
  amount: number,
  currency = "USD",
  noteToPayer?: string,
): Promise<string> {
  const data = await paypalFetch<{ id: string }>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: JSON.stringify({
      amount: { currency_code: currency, value: amount.toFixed(2) },
      ...(noteToPayer ? { note_to_payer: noteToPayer.slice(0, 255) } : {}),
    }),
  });
  return data.id;
}

/** Le manda a un negocio su parte neta de una venta (ya descontada la
 * comisión de MIMO) a su correo de PayPal. */
export async function sendPaypalPayout(params: {
  receiverEmail: string;
  amount: number;
  currency?: string;
  senderItemId: string;
  note?: string;
}): Promise<string> {
  const data = await paypalFetch<{ batch_header: { payout_batch_id: string } }>("/v1/payments/payouts", {
    method: "POST",
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `mimo-${params.senderItemId}`,
        email_subject: "Te llegó un pago en MIMO",
        email_message: params.note ?? "Un cliente confirmó un pedido tuyo en MIMO.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: params.amount.toFixed(2), currency: params.currency ?? "USD" },
          receiver: params.receiverEmail,
          sender_item_id: params.senderItemId,
          note: params.note ?? "Pago de pedido MIMO",
        },
      ],
    }),
  });
  return data.batch_header.payout_batch_id;
}
