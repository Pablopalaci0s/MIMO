import { NextRequest } from "next/server";
import { adminCategoryInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { deleteAdminCategory, updateAdminCategory } from "@/lib/services/admin-category-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = adminCategoryInputSchema.parse(body);

    const category = await updateAdminCategory(id, input);
    return apiSuccess(category);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteAdminCategory(id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
