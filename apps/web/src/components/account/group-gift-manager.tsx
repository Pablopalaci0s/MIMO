"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import type { GroupGiftManageDTO } from "@mimo/types";

const STATUS_LABEL: Record<GroupGiftManageDTO["status"], string> = {
  OPEN: "Abierta",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export function GroupGiftManager({ gift }: { gift: GroupGiftManageDTO }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<"finalize" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/cabudas/${gift.slug}` : "";
  const progress = Math.min(100, Math.round((gift.collectedAmount / gift.targetAmount) * 100));

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runAction(action: "finalize" | "cancel") {
    setLoading(action);
    setError(null);
    const response = await fetch(`/api/perfil/cabudas/${gift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await response.json();
    setLoading(null);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos completar la acción."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4">
        <div className="min-w-0">
          <p className="text-xs text-neutral-400">Link público</p>
          <p className="truncate text-sm font-medium text-neutral-900">{publicUrl}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={copyLink} className="ml-3 shrink-0">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold text-neutral-900">${gift.collectedAmount.toFixed(2)}</p>
          <p className="text-sm text-neutral-500">
            de ${gift.targetAmount.toFixed(2)} · {STATUS_LABEL[gift.status]}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {gift.status === "OPEN" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">
            Cuando estés listo, cerrá la cabuda — te mandamos todo lo recaudado (${gift.collectedAmount.toFixed(2)})
            a <span className="font-medium">{gift.organizerPaypalEmail}</span> por PayPal, y vos hacés la compra
            real de <span className="font-medium">{gift.productName}</span>.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={loading !== null || gift.collectedAmount <= 0}
              onClick={() => runAction("finalize")}
            >
              {loading === "finalize" ? <Loader2 className="size-4 animate-spin" /> : "Cerrar y recibir el dinero"}
            </Button>
            <Button type="button" variant="outline" disabled={loading !== null} onClick={() => runAction("cancel")}>
              {loading === "cancel" ? <Loader2 className="size-4 animate-spin" /> : "Cancelar cabuda"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">
          Aportes ({gift.contributions.length})
        </h2>
        {gift.contributions.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavía nadie aportó.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {gift.contributions.map((c) => (
              <div key={c.id} className="flex justify-between text-sm text-neutral-600">
                <span>
                  {c.contributorName}
                  {c.status !== "PAID" && <span className="ml-1.5 text-xs text-neutral-400">({c.status})</span>}
                </span>
                <span className="font-medium text-neutral-900">${c.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
