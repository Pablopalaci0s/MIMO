import { NextRequest } from "next/server";
import { adminBusinessUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateAdminBusiness } from "@/lib/services/admin-business-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = adminBusinessUpdateSchema.parse(body);

    const business = await updateAdminBusiness(id, input, adminId);
    return apiSuccess(business);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
