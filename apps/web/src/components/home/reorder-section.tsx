import { ProductCard } from "@/components/catalog/product-card";
import type { ProductSummaryDTO } from "@mimo/types";

export function ReorderSection({ products }: { products: ProductSummaryDTO[] }) {
  if (products.length === 0) return null;

  return (
    <section className="min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">Volver a pedir</h2>
        <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
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
