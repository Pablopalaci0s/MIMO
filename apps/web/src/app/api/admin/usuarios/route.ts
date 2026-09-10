import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminUsers } from "@/lib/services/admin-user-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAdminUsers();
    return apiSuccess(users);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
