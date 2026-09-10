import { NextRequest } from "next/server";
import { adminUserUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateAdminUser } from "@/lib/services/admin-user-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = adminUserUpdateSchema.parse(body);

    const user = await updateAdminUser(id, adminId, input);
    return apiSuccess(user);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
