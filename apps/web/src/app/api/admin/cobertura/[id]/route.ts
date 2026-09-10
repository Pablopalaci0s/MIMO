import { NextRequest } from "next/server";
import { coverageRequestStatusUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateCoverageRequestStatus } from "@/lib/services/delivery-coverage-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status } = coverageRequestStatusUpdateSchema.parse(body);

    const result = await updateCoverageRequestStatus(id, status);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
