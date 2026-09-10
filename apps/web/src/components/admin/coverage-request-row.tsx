"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoverageRequestDTO, CoverageRequestStatus } from "@mimo/types";

const STATUS_LABEL: Record<CoverageRequestStatus, string> = {
  OPEN: "Abierta",
  RESOLVED: "Resuelta",
  DISMISSED: "Descartada",
};

const STATUS_VARIANT: Record<CoverageRequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "destructive",
  RESOLVED: "default",
  DISMISSED: "secondary",
};

export function CoverageRequestRow({ request }: { request: CoverageRequestDTO }) {
  const router = useRouter();
  const [loading, setLoading] = useState<CoverageRequestStatus | null>(null);

  async function updateStatus(status: CoverageRequestStatus) {
    setLoading(status);
    await fetch(`/api/admin/cobertura/${request.id}`, {
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
          <p className="font-medium text-neutral-900">{request.businessName}</p>
          <p className="text-sm text-neutral-500">Piden cobertura en {request.municipalityName}</p>
        </div>
        <Badge variant={STATUS_VARIANT[request.status]}>{STATUS_LABEL[request.status]}</Badge>
      </div>

      <p className="text-sm text-neutral-500">
        {request.requesterName ?? request.contactName ?? "Anónimo"}
        {request.contactPhone ? ` · ${request.contactPhone}` : ""}
        {request.contactEmail ? ` · ${request.contactEmail}` : ""}
      </p>

      {request.status === "OPEN" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={loading !== null} onClick={() => updateStatus("RESOLVED")}>
            {loading === "RESOLVED" ? <Loader2 className="size-3.5 animate-spin" /> : "Marcar resuelta"}
          </Button>
          <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => updateStatus("DISMISSED")}>
            {loading === "DISMISSED" ? <Loader2 className="size-3.5 animate-spin" /> : "Descartar"}
          </Button>
        </div>
      )}
    </div>
  );
}
