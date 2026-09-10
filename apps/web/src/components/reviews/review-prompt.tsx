"use client";

import { Loader2, MessageSquarePlus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewableItemDTO, ReviewInput } from "@mimo/types";

export function ReviewPrompt({ item }: { item: ReviewableItemDTO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productRating, setProductRating] = useState(0);
  const [businessRating, setBusinessRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const input: ReviewInput = {
      orderId: item.orderId,
      productId: item.productId,
      businessId: item.businessId,
      productRating: productRating || undefined,
      businessRating: businessRating || undefined,
      comment: comment.trim() || undefined,
    };

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar tu reseña."));
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-500">
        Gracias por tu reseña de <span className="font-medium text-neutral-700">{item.productName}</span> — la vamos a
        publicar apenas la revisemos.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {item.productImageUrl && (
            <Image src={item.productImageUrl} alt={item.productName} fill className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{item.productName}</p>
          <p className="text-xs text-neutral-500">{item.businessName}</p>
        </div>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <MessageSquarePlus /> Dejar reseña
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">El producto</span>
            <StarRating value={productRating} onChange={setProductRating} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">El negocio</span>
            <StarRating value={businessRating} onChange={setBusinessRating} />
          </div>
          <Textarea
            placeholder="Contanos cómo te fue (opcional)"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={loading || (productRating === 0 && businessRating === 0)}
              onClick={handleSubmit}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Enviar reseña"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
