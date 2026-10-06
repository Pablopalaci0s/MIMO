"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";

/** Borra todos los documentos de identidad de un negocio (ej. el titular lo pidió). Irreversible. */
export function DeleteDocumentsButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/negocios/${businessId}/documentos`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "No pudimos borrar los documentos."));
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
        <Trash2 className="size-3.5" /> Borrar todos los documentos
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 text-sm dark:bg-red-500/10">
      <p className="text-neutral-700">
        Se borran los documentos de identidad de este negocio, <strong>sin posibilidad de recuperarlos</strong>. El
        titular tendría que volver a subirlos. Queda registrado en la auditoría.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={remove}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Sí, borrar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
