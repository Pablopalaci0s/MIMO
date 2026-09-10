import { Star, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProductSummaryDTO } from "@mimo/types";

export function ProductCard({ product }: { product: ProductSummaryDTO }) {
  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.18)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {product.availableToday && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
            <Zap className="size-3 text-brand" strokeWidth={2} />
            Hoy
          </span>
        )}
        {product.compareAtPrice && (
          <span className="absolute top-2 right-2 rounded-full bg-brand px-2 py-1 text-[11px] font-medium text-brand-foreground shadow-sm">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <p className="line-clamp-1 text-sm font-medium text-neutral-900">{product.name}</p>
        <p className="line-clamp-1 text-xs text-neutral-500">{product.business.name}</p>

        <div className="mt-1 flex items-center justify-between">
          <span className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-neutral-900">${product.price.toFixed(2)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-neutral-400 line-through">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </span>
          {product.ratingCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-neutral-500">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {product.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
