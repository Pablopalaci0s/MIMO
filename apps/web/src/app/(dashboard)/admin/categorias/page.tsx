import { CategoryManager } from "@/components/admin/category-manager";
import { listAdminCategories } from "@/lib/services/admin-category-service";

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Categorías</h1>
        <p className="text-sm text-neutral-500">{categories.length} categorías del catálogo.</p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
