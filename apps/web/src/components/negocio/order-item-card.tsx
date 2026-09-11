"use client";

import { EyeOff, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { OrderMessages } from "@/components/orders/order-messages";
import { Button } from "@/components/ui/button";
import type { BusinessOrderItemDTO, OrderStatus } from "@mimo/types";

const DELIVERY_WINDOW_LABEL: Record<string, string> = {
  ASAP: "Lo antes posible",
  MORNING: "9 AM – 12 PM",
  MIDDAY: "12 PM – 3 PM",
  AFTERNOON: "3 PM – 6 PM",
  EVENING: "6 PM – 9 PM",
};

const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; variant?: "outline" | "destructive" }[]>> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirmar" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  CONFIRMED: [
    { status: "PREPARING", label: "Marcar preparando" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  PREPARING: [
    { status: "OUT_FOR_DELIVERY", label: "Marcar en camino" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  OUT_FOR_DELIVERY: [{ status: "DELIVERED", label: "Marcar entregado" }],
};

export function OrderItemCard({ item, statusLabel }: { item: BusinessOrderItemDTO; statusLabel: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: OrderStatus) {
    setLoading(status);
    setError(null);
    const response = await fetch(`/api/negocio/pedidos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    setLoading(null);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos actualizar el pedido."));
      return;
    }
    router.refresh();
  }

  const actions = NEXT_ACTIONS[item.status] ?? [];
  // La fecha se guarda como medianoche UTC (ver order-service) — forzar
  // timeZone: "UTC" acá para no correr un día según la zona del navegador.
  const deliveryDate = new Date(item.deliveryDate).toLocaleDateString("es-SV", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">
            #{item.orderNumber} · {deliveryDate} · {DELIVERY_WINDOW_LABEL[item.deliveryWindow]}
          </p>
          <p className="mt-0.5 font-medium text-neutral-900">
            {item.quantity}× {item.productName}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
          {statusLabel}
        </span>
      </div>

      <div className="flex items-start gap-2 text-sm text-neutral-600">
        <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
        <div>
          <p>
            {item.recipientName} · {item.recipientPhone}
          </p>
          <p className="text-neutral-500">
            {item.addressLine}
            {item.reference ? ` (${item.reference})` : ""}
            {item.municipalityName ? `, ${item.municipalityName}` : ""}
          </p>
          {item.deliveryInstructions && (
            <p className="mt-1 text-neutral-500 italic">&ldquo;{item.deliveryInstructions}&rdquo;</p>
          )}
        </div>
      </div>

      {item.isSurpriseMode && (
        <div className="flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-neutral-700">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <p className="font-medium">Modo sorpresa — no reveles quién lo envía.</p>
            {item.surpriseInstructions && <p className="mt-0.5 text-neutral-600">{item.surpriseInstructions}</p>}
          </div>
        </div>
      )}

      {item.personalization && (
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          {item.personalization.dedication && <p>Dedicatoria: &ldquo;{item.personalization.dedication}&rdquo;</p>}
          {item.personalization.message && <p>Mensaje: &ldquo;{item.personalization.message}&rdquo;</p>}
          {item.personalization.cardText && <p>Tarjeta: &ldquo;{item.personalization.cardText}&rdquo;</p>}
          {item.personalization.color && <p>Color: {item.personalization.color}</p>}
          {item.personalization.size && <p>Tamaño: {item.personalization.size}</p>}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Comprador: {item.buyerName} · {item.buyerPhone}
      </p>

      <OrderMessages orderNumber={item.orderNumber} businessId={item.businessId} viewerRole="BUSINESS" />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant ?? "default"}
              disabled={loading !== null}
              onClick={() => updateStatus(action.status)}
            >
              {loading === action.status ? <Loader2 className="size-3.5 animate-spin" /> : action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
