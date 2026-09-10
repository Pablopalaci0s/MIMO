import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getBusinessDashboardSummary } from "@/lib/services/business-dashboard-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    const summary = await getBusinessDashboardSummary(businessId);
    return apiSuccess(summary);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
