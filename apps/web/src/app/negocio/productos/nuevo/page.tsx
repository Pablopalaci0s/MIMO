import type { Metadata } from "next";
import { ProductForm } from "@/components/negocio/product-form";
import { listCategories } from "@/lib/services/catalog-service";

export const metadata: Metadata = { title: "Nuevo producto — MIMO" };

export default async function NewBusinessProductPage() {
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Nuevo producto</h2>
      <ProductForm categories={categories} />
    </div>
  );
}
