import { MessageCircleHeart, Star, Truck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { GiftRecommendation } from "@mimo/types";

export function RecommendationCard({
  recommendation,
  position,
}: {
  recommendation: GiftRecommendation;
  position: number;
}) {
  const { product, explanation } = recommendation;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 sm:flex-row">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
        {position}
      </span>

      <Link
        href={`/productos/${product.slug}`}
        className="group relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:w-32"
      >
        {product.coverImageUrl && (
          <Image
            src={product.coverImageUrl}
            alt={product.name}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href={`/productos/${product.slug}`} className="font-medium text-neutral-900 hover:underline">
              {product.name}
            </Link>
            <p className="text-sm text-neutral-500">{product.business.name}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-neutral-900">${product.price.toFixed(2)}</p>
            {product.compareAtPrice && (
              <p className="text-xs text-neutral-400 line-through">${product.compareAtPrice.toFixed(2)}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          {product.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {product.ratingAvg.toFixed(1)}
            </span>
          )}
          {product.availableToday && (
            <span className="flex items-center gap-1 text-brand">
              <Zap className="size-3.5" />
              Disponible hoy
            </span>
          )}
          <span className="flex items-center gap-1">
            <Truck className="size-3.5" />
            Prep. {product.preparationTimeMinutes} min
          </span>
        </div>

        <div className="mt-1 flex items-start gap-1.5 rounded-xl bg-brand-soft px-3 py-2 text-sm text-neutral-700">
          <MessageCircleHeart className="mt-0.5 size-4 shrink-0 text-brand" />
          <span>{explanation}</span>
        </div>
      </div>
    </div>
  );
}
