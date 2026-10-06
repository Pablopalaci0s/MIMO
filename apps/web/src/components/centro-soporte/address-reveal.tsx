"use client";

import { Eye, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";
import type { SupportOrderAddressDTO } from "@mimo/types";

const WINDOW_LABEL: Record<string, string> = {
  ASAP: "Lo antes posible",
  MORNING: "Mañana (9–12)",
  MIDDAY: "Mediodía (12–3)",
  AFTERNOON: "Tarde (3–6)",
  EVENING: "Noche (6–9)",
};

/**
 * La dirección completa NO viaja con el ticket: se muestra solo si el agente
 * la pide, y cada vez queda registrada en la auditoría (quién y cuándo).
 */
export function AddressReveal({ ticketId, canReveal }: { ticketId: string; canReveal: boolean }) {
  const [address, setAddress] = useState<SupportOrderAddressDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/centro-soporte/tickets/${ticketId}/direccion`, { method: "POST" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setLoading(false);
    if (!result?.success) {
      setError(apiErrorMessage(result, "No pudimos cargar la dirección."));
      return;
    }
    setAddress(result.data);
  }

  if (address) {
    return (
      <div className="rounded-lg bg-neutral-100 p-2.5 text-xs leading-relaxed text-neutral-700">
        <p className="mb-1 flex items-center gap-1 font-medium text-neutral-900">
          <MapPin className="size-3" /> Dirección de entrega
        </p>
        <p>
          {address.recipientName} · {address.recipientPhone}
        </p>
        <p>{address.addressLine}</p>
        {address.reference && <p>Referencia: {address.reference}</p>}
        <p>
          {[address.municipality, address.department].filter(Boolean).join(", ")}
        </p>
        <p>
          {new Date(address.deliveryDate).toLocaleDateString("es-SV")} · {WINDOW_LABEL[address.deliveryWindow] ?? address.deliveryWindow}
        </p>
        {address.deliveryInstructions && <p>Indicaciones: {address.deliveryInstructions}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" variant="outline" disabled={loading || !canReveal} onClick={() => void reveal()}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} Ver dirección de entrega
      </Button>
      <p className="text-[11px] text-neutral-400">Solo si hace falta para resolver el caso. Queda registrado.</p>
      {!canReveal && <p className="text-[11px] text-neutral-400">Tomá el ticket para poder verla.</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
