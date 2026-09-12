"use client";

import { CheckCircle2, Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReserveGiftButton({
  slug,
  itemId,
  initiallyReserved,
}: {
  slug: string;
  itemId: string;
  initiallyReserved: boolean;
}) {
  const [reserved, setReserved] = useState(initiallyReserved);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (reserved) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <CheckCircle2 className="size-4" /> Reservado
      </span>
    );
  }

  async function handleReserve() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/listas/${slug}/reservar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, reservedByName: name.trim() }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos reservar este regalo."));
      return;
    }
    setReserved(true);
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Gift className="size-3.5" /> Reservar
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <Input
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Button type="button" size="sm" disabled={loading || !name.trim()} onClick={handleReserve}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Confirmar"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
