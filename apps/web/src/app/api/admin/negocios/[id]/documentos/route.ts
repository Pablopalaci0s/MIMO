import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireDocumentReviewer } from "@/lib/services/admin-service";
import { deleteAllBusinessDocuments } from "@/lib/services/business-document-service";

/** Borra todos los documentos de identidad de un negocio (ej. el titular lo pidió). Irreversible y auditado. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireDocumentReviewer();
    const businessId = z.string().uuid().parse((await params).id);
    return apiSuccess(await deleteAllBusinessDocuments(businessId, adminId));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
