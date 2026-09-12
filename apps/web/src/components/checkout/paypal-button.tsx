"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import type { CheckoutInput } from "@mimo/types";

// El SDK de PayPal se carga con un <script> normal (no hay paquete npm
// oficial liviano para esto) y cuelga su API de `window.paypal` — no hay
// tipos oficiales, así que lo tratamos como opaco.
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string | number>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (error: unknown) => void;
      }) => { render: (container: HTMLElement) => void };
    };
  }
}

type CheckoutPayload = Omit<CheckoutInput, "paymentProvider" | "paypalOrderId">;

export function PaypalButton({
  buildPayload,
  onSuccess,
}: {
  /** Arma el payload del checkout desde el estado del formulario, o
   * devuelve un mensaje de error si falta algo — mismo dato que usaría el
   * pago en efectivo, solo que acá el pago pasa ANTES de crear el pedido. */
  buildPayload: () => CheckoutPayload | { error: string };
  onSuccess: (orderNumber: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState<string | null>(null);
  // `createOrder` a veces tira a propósito (carrito inválido, nuestro back
  // rechazó el monto) y ya deja en `error` un mensaje específico — sin esto,
  // el `onError` genérico del SDK de PayPal lo pisa siempre con "Ocurrió un
  // error con PayPal" un instante después (bug real, encontrado probando en
  // vivo: el mensaje específico aparecía y desaparecía enseguida).
  const handledErrorRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const keyResponse = await fetch("/api/payments/paypal-client-id");
      const keyBody = await keyResponse.json();
      if (cancelled) return;
      if (!keyBody.success) {
        setStatus("unavailable");
        return;
      }

      if (!window.paypal) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(keyBody.data.clientId)}&currency=USD&intent=capture`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("No se pudo cargar el SDK de PayPal"));
          document.body.appendChild(script);
        }).catch(() => null);
      }
      if (cancelled || !window.paypal || !containerRef.current) {
        if (!cancelled) setStatus("unavailable");
        return;
      }

      window.paypal
        .Buttons({
          style: { layout: "horizontal", height: 45 },
          createOrder: async () => {
            setError(null);
            const payload = buildPayload();
            if ("error" in payload) {
              setError(payload.error);
              handledErrorRef.current = true;
              throw new Error(payload.error);
            }
            const response = await fetch("/api/payments/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: payload.items, address: payload.address }),
            });
            const body = await response.json();
            if (!body.success) {
              const message = apiErrorMessage(body, "No pudimos iniciar el pago con PayPal.");
              setError(message);
              handledErrorRef.current = true;
              throw new Error(message);
            }
            return body.data.paypalOrderId as string;
          },
          onApprove: async (data) => {
            const payload = buildPayload();
            if ("error" in payload) {
              setError(payload.error);
              return;
            }
            const response = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, paymentProvider: "PAYPAL", paypalOrderId: data.orderID }),
            });
            const body = await response.json();
            if (!body.success) {
              setError(apiErrorMessage(body, "Te cobramos, pero no pudimos crear el pedido. Contactá soporte."));
              return;
            }
            onSuccess(body.data.orderNumber as string);
          },
          onCancel: () => setError(null),
          onError: () => {
            if (handledErrorRef.current) {
              handledErrorRef.current = false;
              return;
            }
            setError("Ocurrió un error con PayPal. Intentá de nuevo.");
          },
        })
        .render(containerRef.current);

      if (!cancelled) setStatus("ready");
    }

    void setup();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "unavailable") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">
        <AlertCircle className="size-4 shrink-0" />
        El pago con PayPal no está disponible en este momento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "loading" && (
        <div className="flex h-11 items-center justify-center rounded-xl bg-neutral-50">
          <Loader2 className="size-4 animate-spin text-neutral-400" />
        </div>
      )}
      <div ref={containerRef} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
