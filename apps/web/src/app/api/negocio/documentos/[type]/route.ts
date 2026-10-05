import { businessDocumentTypeSchema } from "@mimo/validation";
import { apiError, apiErrorFromException } from "@/lib/api-response";
import { documentResponse } from "@/lib/document-response";
import { requireBusinessId } from "@/lib/services/business-service";
import { getBusinessDocumentFile } from "@/lib/services/business-document-service";

/** El titular ve sus propios documentos — el `businessId` sale de la sesión. */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const type = businessDocumentTypeSchema.parse((await params).type);
    const file = await getBusinessDocumentFile(businessId, type);
    if (!file) return apiError("NOT_FOUND", "No subiste ese documento.", 404);
    return documentResponse(file);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
