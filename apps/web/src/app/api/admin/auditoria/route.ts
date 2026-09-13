import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminActionLogs } from "@/lib/services/admin-audit-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const logs = await listAdminActionLogs();
    return apiSuccess(logs);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
