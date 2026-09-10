import { NextRequest } from "next/server";
import { adminReportStatusUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateAdminReportStatus } from "@/lib/services/admin-report-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status } = adminReportStatusUpdateSchema.parse(body);

    const report = await updateAdminReportStatus(id, status);
    return apiSuccess(report);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
