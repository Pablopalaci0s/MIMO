"use client";

import { Loader2, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminReviewDTO, ModerationStatus } from "@mimo/types";

const STATUS_LABEL: Record<ModerationStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_VARIANT: Record<ModerationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

function Rating({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-neutral-500">
      {label} <Star className="size-3 fill-amber-400 text-amber-400" /> {value}
    </span>
  );
}

export function ReviewRow({ review }: { review: AdminReviewDTO }) {
  const router = useRouter();
  const [loading, setLoading] = useState<ModerationStatus | null>(null);

  async function updateStatus(status: ModerationStatus) {
    setLoading(status);
    await fetch(`/api/admin/resenas/${review.id}`, {
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
            {review.userName}
            {review.productName ? ` · ${review.productName}` : ""}
            {review.businessName ? ` · ${review.businessName}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <Rating label="Producto" value={review.productRating} />
            <Rating label="Negocio" value={review.businessRating} />
            <Rating label="Entrega" value={review.deliveryRating} />
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[review.status]}>{STATUS_LABEL[review.status]}</Badge>
      </div>

      {review.comment && <p className="text-sm text-neutral-700">&ldquo;{review.comment}&rdquo;</p>}

      {review.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="relative size-16 overflow-hidden rounded-lg bg-neutral-100">
              <Image src={url} alt="" fill className="object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          disabled={loading !== null || review.status === "APPROVED"}
          onClick={() => updateStatus("APPROVED")}
        >
          {loading === "APPROVED" ? <Loader2 className="size-3.5 animate-spin" /> : "Aprobar"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null || review.status === "REJECTED"}
          onClick={() => updateStatus("REJECTED")}
        >
          {loading === "REJECTED" ? <Loader2 className="size-3.5 animate-spin" /> : "Rechazar"}
        </Button>
      </div>
    </div>
  );
}
