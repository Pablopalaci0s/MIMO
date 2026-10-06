"use client";

import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api-error-message";
import { DOCUMENT_REJECTION_REASONS, type DocumentRejectionReason } from "@mimo/validation";

/**
 * Rechazar un documento de verificación (borroso, incompleto…): el titular
 * recibe una notificación con el motivo y tiene que subir uno nuevo. Mientras
 * tanto el documento cuenta como "no subido".
 */
export function RejectDocumentForm({ businessId, type }: { businessId: string; type: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DocumentRejectionReason>("BLURRY");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/negocios/${businessId}/documentos/${type}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, note: note.trim() || undefined }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "No pudimos rechazar el documento."));
      return;
    }
    setOpen(false);
    setNote("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <XCircle className="size-3.5" /> Rechazar
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Motivo
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as DocumentRejectionReason)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-900 dark:bg-neutral-100"
        >
          {(Object.keys(DOCUMENT_REJECTION_REASONS) as DocumentRejectionReason[]).map((key) => (
            <option key={key} value={key}>
              {DOCUMENT_REJECTION_REASONS[key]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Nota para el titular {reason === "OTHER" ? "(obligatoria)" : "(opcional)"}
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Ej. Se corta la esquina inferior del DUI."
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={submit}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Rechazar y avisar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
