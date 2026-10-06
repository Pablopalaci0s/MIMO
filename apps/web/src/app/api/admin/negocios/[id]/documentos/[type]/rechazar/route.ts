import { NextRequest } from "next/server";
import { z } from "zod";
import { businessDocumentTypeSchema, rejectBusinessDocumentSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireDocumentReviewer } from "@/lib/services/admin-service";
import { rejectBusinessDocument } from "@/lib/services/business-document-service";

/** Un admin rechaza un documento (borroso, incompleto, etc.): el titular recibe el motivo y sube uno nuevo. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; type: string }> }) {
  try {
    const adminId = await requireDocumentReviewer();
    const { id, type: rawType } = await params;
    const businessId = z.string().uuid().parse(id);
    const type = businessDocumentTypeSchema.parse(rawType);
    const input = rejectBusinessDocumentSchema.parse(await request.json());

    return apiSuccess(await rejectBusinessDocument(businessId, type, input, adminId));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
