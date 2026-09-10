import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getAdminStats, requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getAdminStats();
    return apiSuccess(stats);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
