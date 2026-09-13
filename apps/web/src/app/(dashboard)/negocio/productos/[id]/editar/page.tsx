import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/negocio/product-form";
import { listCategories } from "@/lib/services/catalog-service";
import { getBusinessProductById } from "@/lib/services/business-product-service";
import { requireBusinessId } from "@/lib/services/business-service";

export const metadata: Metadata = { title: "Editar producto — MIMO" };

export default async function EditBusinessProductPage({ params }: PageProps<"/negocio/productos/[id]/editar">) {
  const { id } = await params;
  const businessId = await requireBusinessId();
  const [categories, product] = await Promise.all([listCategories(), getBusinessProductById(businessId, id)]);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Editar producto</h1>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 dark:bg-neutral-100">
        <ProductForm categories={categories} product={product} productId={product.id} />
      </div>
    </div>
  );
}
