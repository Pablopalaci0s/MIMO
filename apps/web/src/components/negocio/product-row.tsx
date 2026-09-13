import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProductRowActions } from "@/components/negocio/product-row-actions";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { getCategoryIcon } from "@/lib/category-icons";
import type { BusinessProductDTO } from "@mimo/types";

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

export function ProductRow({ product }: { product: BusinessProductDTO }) {
  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="py-2.5 pl-4">
        <div className="flex items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            {product.images[0] ? (
              <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
            ) : (
              <MediaPlaceholder icon={getCategoryIcon(product.categorySlug)} iconClassName="size-4" />
            )}
          </div>
          <span className="line-clamp-1 font-medium text-neutral-900">{product.name}</span>
        </div>
      </td>
      <td className="py-2.5 text-neutral-500">${product.price.toFixed(2)}</td>
      <td className="py-2.5 text-neutral-500">{product.stock}</td>
      <td className="py-2.5 text-neutral-500">{product.availableToday ? "Sí" : "No"}</td>
      <td className="py-2.5">
        <Badge variant={STATUS_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex justify-end">
          <ProductRowActions productId={product.id} productName={product.name} />
        </div>
      </td>
    </tr>
  );
}
