import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductRowActions } from "@/components/negocio/product-row-actions";
import { listBusinessProducts } from "@/lib/services/business-product-service";
import { requireBusinessId } from "@/lib/services/business-service";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "outline",
  INACTIVE: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  DRAFT: "Borrador",
  INACTIVE: "Inactivo",
};

export default async function BusinessProductsPage() {
  const businessId = await requireBusinessId();
  const products = await listBusinessProducts(businessId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/negocio/productos/nuevo">
            <Plus /> Nuevo producto
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
          Todavía no tenés productos. Creá el primero para empezar a vender.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {product.images[0] && (
                  <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">{product.name}</p>
                <p className="text-sm text-neutral-500">
                  ${product.price.toFixed(2)} · Stock: {product.stock}
                  {!product.availableToday && " · No disponible hoy"}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
              <ProductRowActions productId={product.id} productName={product.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
