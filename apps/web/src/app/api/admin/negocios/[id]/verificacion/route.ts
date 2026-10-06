import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyIdentitySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireDocumentReviewer } from "@/lib/services/admin-service";
import { verifyIdentity } from "@/lib/services/identity-verification-service";

/**
 * Un administrador autorizado registra la verificación de identidad del
 * titular (y aprueba el negocio si todavía no lo estaba). Recibe el número
 * completo del DUI SOLO para sacar los últimos 4 dígitos y la huella HMAC:
 * no se guarda, no se loguea y no vuelve en ninguna respuesta.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireDocumentReviewer();
    const businessId = z.string().uuid().parse((await params).id);

    const limited = rateLimitResponse(request, "admin-verificacion", 60, 60 * 60 * 1000, adminId);
    if (limited) return limited;

    const input = verifyIdentitySchema.parse(await request.json());
    return apiSuccess(await verifyIdentity(businessId, input, adminId));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
