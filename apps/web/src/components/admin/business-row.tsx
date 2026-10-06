"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/lib/api-error-message";
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
  const [commissionRate, setCommissionRate] = useState(String(business.commissionRate));
  const [error, setError] = useState<string | null>(null);

  async function update(
    input: { status?: BusinessStatus; verified?: boolean; commissionRate?: number },
    key: string,
  ) {
    setLoading(key);
    setError(null);
    const response = await fetch(`/api/admin/negocios/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setLoading(null);
    if (!response.ok) {
      // Ej. "todavía no aceptó el Acuerdo MIMO ↔ negocio": el admin tiene
      // que ver por qué no se aprobó, no que el botón "no hizo nada".
      const body = await response.json().catch(() => null);
      setError(apiErrorMessage(body, "No se pudo guardar el cambio."));
      if (input.commissionRate !== undefined) setCommissionRate(String(business.commissionRate));
      return;
    }
    router.refresh();
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="py-3 pl-4">
        <Link href={`/negocios/${business.slug}`} className="font-medium text-neutral-900 hover:underline">
          {business.name}
        </Link>
        {business.isDemo && (
          <Badge variant="outline" className="ml-2">
            Demo
          </Badge>
        )}
      </td>
      <td className="py-3">
        <Badge variant={STATUS_VARIANT[business.status]}>{STATUS_LABEL[business.status]}</Badge>
        {!business.isDemo && (
          <p className={`mt-1 text-xs ${business.agreementAccepted ? "text-neutral-400" : "text-amber-600"}`}>
            {business.agreementAccepted ? "Acuerdo aceptado" : "Sin aceptar el acuerdo"}
          </p>
        )}
        {!business.isDemo && (
          <p className={`text-xs ${business.documentsComplete ? "text-neutral-400" : "text-amber-600"}`}>
            <Link href={`/admin/negocios/${business.id}/documentos`} className="underline hover:text-neutral-900">
              {business.identityVerified
                ? "Identidad verificada"
                : business.documentsComplete
                  ? "Documentos completos"
                  : `Faltan documentos (${business.documentsCount} subidos)`}
            </Link>
          </p>
        )}
        {error && <p className="mt-1 max-w-48 text-xs text-destructive">{error}</p>}
      </td>
      <td className="py-3 text-neutral-500">{business.ownerEmail ?? "—"}</td>
      <td className="py-3 text-neutral-500">{business.municipalityName ?? "—"}</td>
      <td className="py-3 text-neutral-500">{business.productCount}</td>
      <td className="py-3">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            onBlur={() => {
              const parsed = Number(commissionRate);
              if (Number.isNaN(parsed)) {
                setCommissionRate(String(business.commissionRate));
                return;
              }
              const clamped = Math.min(100, Math.max(0, parsed));
              setCommissionRate(String(clamped));
              if (clamped !== business.commissionRate) {
                update({ commissionRate: clamped }, "commissionRate");
              }
            }}
            disabled={loading !== null}
            className="h-8 w-16 text-sm"
          />
          <span className="text-xs text-neutral-400">%</span>
        </div>
      </td>
      <td className="py-3">
        <Switch
          checked={business.verified}
          disabled={loading !== null}
          onCheckedChange={(checked) => update({ verified: checked }, "verified")}
        />
      </td>
      <td className="py-3 pr-4">
        <div className="flex justify-end gap-2">
          {NEXT_ACTIONS[business.status].map((action) => {
            // Un negocio real que todavía no fue aprobado se aprueba desde la
            // revisión de documentos (ahí se verifica la identidad del titular).
            if (action.status === "APPROVED" && !business.isDemo && (business.status === "PENDING" || business.status === "REJECTED")) {
              return (
                <Button key={action.status} size="sm" asChild>
                  <Link href={`/admin/negocios/${business.id}/documentos`}>Revisar y aprobar</Link>
                </Button>
              );
            }
            return (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant ?? "default"}
              disabled={loading !== null}
              onClick={() => update({ status: action.status }, action.status)}
            >
              {loading === action.status ? <Loader2 className="size-3.5 animate-spin" /> : action.label}
            </Button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
