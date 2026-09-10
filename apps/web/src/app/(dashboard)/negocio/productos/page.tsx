import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/dashboard/data-table";
import { ProductRow } from "@/components/negocio/product-row";
import { listBusinessProducts } from "@/lib/services/business-product-service";
import { requireBusinessId } from "@/lib/services/business-service";

const COLUMNS = [
  { label: "Producto" },
  { label: "Precio" },
  { label: "Stock" },
  { label: "Hoy" },
  { label: "Estado" },
  { label: "", className: "text-right" },
];

export default async function BusinessProductsPage() {
  const businessId = await requireBusinessId();
  const products = await listBusinessProducts(businessId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Productos</h1>
          <p className="text-sm text-neutral-500">{products.length} productos en tu catálogo.</p>
        </div>
        <Button asChild>
          <Link href="/negocio/productos/nuevo">
            <Plus /> Nuevo producto
          </Link>
        </Button>
      </div>

      <DataTable
        columns={COLUMNS}
        isEmpty={products.length === 0}
        emptyMessage="Todavía no tenés productos. Creá el primero para empezar a vender."
      >
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </DataTable>
    </div>
  );
}
