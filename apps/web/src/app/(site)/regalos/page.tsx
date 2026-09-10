import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogPagination } from "@/components/catalog/pagination";
import { ProductCard } from "@/components/catalog/product-card";
import { listCategories } from "@/lib/services/catalog-service";
import { listProducts } from "@/lib/services/product-service";
import { productFiltersSchema } from "@mimo/validation";

export const metadata: Metadata = {
  title: "Regalos — MIMO",
  description: "Explorá flores, chocolates, cajas de regalo y más detalles de negocios salvadoreños.",
};

function buildQueryString(params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/regalos?${qs}` : "/regalos";
}

export default async function RegalosPage({ searchParams }: PageProps<"/regalos">) {
  const rawParams = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const parsed = productFiltersSchema.parse(flat);

  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts(
      {
        categorySlug: parsed.categoria,
        occasionSlug: parsed.emocion ?? parsed.ocasion,
        minPrice: parsed.precioMin,
        maxPrice: parsed.precioMax,
        municipalitySlug: parsed.ubicacion,
        availableToday: parsed.disponibleHoy,
        onSale: parsed.oferta,
        sort: parsed.orden,
        query: parsed.q,
      },
      { page: parsed.page },
    ),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Regalos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {result.total} {result.total === 1 ? "resultado" : "resultados"} disponibles.
        </p>
      </div>

      <CatalogFilters categories={categories} />

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <p className="text-lg font-medium text-neutral-900">No encontramos regalos con esos filtros</p>
          <p className="text-sm text-neutral-500">Probá ajustando la categoría o el precio.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <CatalogPagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => buildQueryString(flat, page)}
      />
    </div>
  );
}
