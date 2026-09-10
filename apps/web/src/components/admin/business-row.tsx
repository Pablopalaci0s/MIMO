"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { AdminBusinessDTO, BusinessStatus } from "@mimo/types";

const STATUS_VARIANT: Record<BusinessStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  APPROVED: "default",
  SUSPENDED: "destructive",
  REJECTED: "secondary",
};

const STATUS_LABEL: Record<BusinessStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  SUSPENDED: "Suspendido",
  REJECTED: "Rechazado",
};

const NEXT_ACTIONS: Record<BusinessStatus, { status: BusinessStatus; label: string; variant?: "outline" | "destructive" }[]> = {
  PENDING: [
    { status: "APPROVED", label: "Aprobar" },
    { status: "REJECTED", label: "Rechazar", variant: "destructive" },
  ],
  APPROVED: [{ status: "SUSPENDED", label: "Suspender", variant: "destructive" }],
  SUSPENDED: [{ status: "APPROVED", label: "Reactivar" }],
  REJECTED: [{ status: "APPROVED", label: "Aprobar" }],
};

export function BusinessRow({ business }: { business: AdminBusinessDTO }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function update(input: { status?: BusinessStatus; verified?: boolean }, key: string) {
    setLoading(key);
    await fetch(`/api/admin/negocios/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/negocios/${business.slug}`} className="font-medium text-neutral-900 hover:underline">
            {business.name}
          </Link>
          <Badge variant={STATUS_VARIANT[business.status]}>{STATUS_LABEL[business.status]}</Badge>
          {business.isDemo && <Badge variant="outline">Demo</Badge>}
        </div>
        <p className="text-sm text-neutral-500">
          {business.ownerEmail ?? "Sin dueño vinculado"} · {business.productCount} productos ·{" "}
          {business.municipalityName ?? "Sin ubicación"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Switch
            checked={business.verified}
            disabled={loading !== null}
            onCheckedChange={(checked) => update({ verified: checked }, "verified")}
          />
          Verificado
        </label>
        {NEXT_ACTIONS[business.status].map((action) => (
          <Button
            key={action.status}
            size="sm"
            variant={action.variant ?? "default"}
            disabled={loading !== null}
            onClick={() => update({ status: action.status }, action.status)}
          >
            {loading === action.status ? <Loader2 className="size-3.5 animate-spin" /> : action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
