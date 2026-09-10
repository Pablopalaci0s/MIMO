import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminReviews } from "@/lib/services/admin-review-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const reviews = await listAdminReviews();
    return apiSuccess(reviews);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
