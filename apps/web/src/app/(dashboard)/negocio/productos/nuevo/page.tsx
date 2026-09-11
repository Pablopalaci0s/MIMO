import type { Metadata } from "next";
import { ProductForm } from "@/components/negocio/product-form";
import { listCategories } from "@/lib/services/catalog-service";

export const metadata: Metadata = { title: "Nuevo producto — MIMO" };

export default async function NewBusinessProductPage() {
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Nuevo producto</h1>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 dark:bg-neutral-100">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
