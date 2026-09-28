import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import type { ProductSummaryDTO } from "@mimo/types";

export function ReorderSection({ products }: { products: ProductSummaryDTO[] }) {
  if (products.length === 0) return null;

  return (
    <section className="min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900">
            <span className="h-4 w-1 rounded-full bg-brand" />
            Volver a pedir
          </h2>
          <Link
            href="/mis-pedidos"
            className="group flex items-center gap-1 text-sm font-medium text-neutral-500 transition-colors hover:text-brand"
          >
            Ver todo
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="scrollbar-hide -mx-4 -my-2 flex gap-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:my-0 sm:grid sm:grid-cols-3 sm:px-0 sm:py-0 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="w-40 shrink-0 sm:w-auto">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
