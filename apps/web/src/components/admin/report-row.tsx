"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminReportDTO, ReportStatus } from "@mimo/types";

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Abierto",
  REVIEWED: "Revisado",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
};

const STATUS_VARIANT: Record<ReportStatus, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "destructive",
  REVIEWED: "outline",
  RESOLVED: "default",
  DISMISSED: "secondary",
};

const TARGET_LABEL: Record<AdminReportDTO["targetType"], string> = {
  PRODUCT: "Producto",
  BUSINESS: "Negocio",
  REVIEW: "Reseña",
  USER: "Usuario",
};

const NEXT_ACTIONS: Record<ReportStatus, { status: ReportStatus; label: string; variant?: "outline" | "destructive" }[]> = {
  OPEN: [
    { status: "REVIEWED", label: "Marcar revisado" },
    { status: "DISMISSED", label: "Descartar", variant: "outline" },
  ],
  REVIEWED: [
    { status: "RESOLVED", label: "Resolver" },
    { status: "DISMISSED", label: "Descartar", variant: "outline" },
  ],
  RESOLVED: [],
  DISMISSED: [],
};

export function ReportRow({ report }: { report: AdminReportDTO }) {
  const router = useRouter();
  const [loading, setLoading] = useState<ReportStatus | null>(null);

  async function updateStatus(status: ReportStatus) {
    setLoading(status);
    await fetch(`/api/admin/reportes/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">
            {TARGET_LABEL[report.targetType]} · reportado por {report.reporterName}
          </p>
          <p className="mt-0.5 font-medium text-neutral-900">{report.targetLabel ?? "(contenido eliminado)"}</p>
        </div>
        <Badge variant={STATUS_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
      </div>

      <p className="text-sm text-neutral-700">{report.reason}</p>
      {report.description && <p className="text-sm text-neutral-500">{report.description}</p>}

      {NEXT_ACTIONS[report.status].length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {NEXT_ACTIONS[report.status].map((action) => (
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
