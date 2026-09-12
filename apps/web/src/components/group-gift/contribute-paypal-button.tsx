"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";

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

/**
 * Botón de PayPal para aportar a una colecta grupal — mismo mecanismo de
 * dos pasos que el checkout (`checkout/paypal-button.tsx`), pero mucho más
 * chico: acá no hay carrito ni dirección, solo un nombre y un monto.
 */
export function ContributePaypalButton({
  slug,
  contributorName,
  amount,
  onSuccess,
}: {
  slug: string;
  contributorName: string;
  amount: number;
  onSuccess: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState<string | null>(null);
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

      let contributionId: string | null = null;

      window.paypal
        .Buttons({
          style: { layout: "horizontal", height: 40 },
          createOrder: async () => {
            setError(null);
            const response = await fetch(`/api/colectas/${slug}/aportar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contributorName, amount }),
            });
            const body = await response.json();
            if (!body.success) {
              const message = apiErrorMessage(body, "No pudimos iniciar tu aporte.");
              setError(message);
              handledErrorRef.current = true;
              throw new Error(message);
            }
            contributionId = body.data.contributionId;
            return body.data.paypalOrderId as string;
          },
          onApprove: async (data) => {
            const response = await fetch(`/api/colectas/${slug}/confirmar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contributionId, paypalOrderId: data.orderID }),
            });
            const body = await response.json();
            if (!body.success) {
              setError(apiErrorMessage(body, "Te cobramos, pero no pudimos confirmar el aporte. Contactá soporte."));
              return;
            }
            onSuccess();
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
        <div className="flex h-10 items-center justify-center rounded-xl bg-neutral-50">
          <Loader2 className="size-4 animate-spin text-neutral-400" />
        </div>
      )}
      <div ref={containerRef} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
