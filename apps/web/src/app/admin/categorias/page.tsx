import { CategoryManager } from "@/components/admin/category-manager";
import { listAdminCategories } from "@/lib/services/admin-category-service";

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return <CategoryManager categories={categories} />;
}
