import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminReports } from "@/lib/services/admin-report-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const reports = await listAdminReports();
    return apiSuccess(reports);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
