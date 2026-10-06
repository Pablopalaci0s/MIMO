import { z } from "zod";
import { businessDocumentTypeSchema } from "@mimo/validation";
import { apiError, apiErrorFromException } from "@/lib/api-response";
import { documentResponse } from "@/lib/document-response";
import { requireDocumentReviewer } from "@/lib/services/admin-service";
import { getBusinessDocumentFileForAdmin } from "@/lib/services/business-document-service";

/** Un admin abre el documento de un negocio — cada vista queda en la auditoría. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const adminId = await requireDocumentReviewer();
    const { id, type: rawType } = await params;
    const businessId = z.string().uuid().parse(id);
    const type = businessDocumentTypeSchema.parse(rawType);
    const file = await getBusinessDocumentFileForAdmin(businessId, type, adminId);
    if (!file) return apiError("NOT_FOUND", "El negocio no subió ese documento.", 404);
    return documentResponse(file);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
