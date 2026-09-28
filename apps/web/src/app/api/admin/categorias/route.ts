import { NextRequest } from "next/server";
import { adminCategoryInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createAdminCategory, listAdminCategories } from "@/lib/services/admin-category-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const categories = await listAdminCategories();
    return apiSuccess(categories);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin();
    const body = await request.json();
    const input = adminCategoryInputSchema.parse(body);

    const category = await createAdminCategory(input, adminId);
    return apiSuccess(category, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
