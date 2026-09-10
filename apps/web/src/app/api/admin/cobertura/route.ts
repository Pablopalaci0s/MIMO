import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminCoverageRequests } from "@/lib/services/delivery-coverage-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const requests = await listAdminCoverageRequests();
    return apiSuccess(requests);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
