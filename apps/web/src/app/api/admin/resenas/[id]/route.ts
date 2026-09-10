import { NextRequest } from "next/server";
import { adminReviewStatusUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateAdminReviewStatus } from "@/lib/services/admin-review-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status } = adminReviewStatusUpdateSchema.parse(body);

    const review = await updateAdminReviewStatus(id, status);
    return apiSuccess(review);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
