import { NextRequest } from "next/server";
import { supportEscalateSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requestHuman } from "@/lib/services/support-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Cada escalada manda un correo y notificaciones al equipo: tope bajo.
    const limited = rateLimitResponse(request, "soporte-escalar", 6, 60 * 60 * 1000, userId ?? undefined);
    if (limited) return limited;

    const input = supportEscalateSchema.parse(await request.json());
    const conversation = await requestHuman({ ...input, userId });
    return apiSuccess({ conversation });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
