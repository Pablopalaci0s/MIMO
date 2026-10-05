import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { businessDocumentTypeSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireBusinessId } from "@/lib/services/business-service";
import { listBusinessDocuments, saveBusinessDocument } from "@/lib/services/business-document-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    return apiSuccess(await listBusinessDocuments(businessId));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

/** Sube (o reemplaza) un documento de verificación del propio negocio. */
export async function POST(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const session = await auth();

    const limited = rateLimitResponse(request, "negocio-documentos", 30, 60 * 60 * 1000, session!.user.id);
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return apiError("INVALID_FILE", "No se envió ningún archivo.", 400);
    const type = businessDocumentTypeSchema.parse(formData.get("type"));

    return apiSuccess(await saveBusinessDocument(businessId, session!.user.id, type, file), 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
