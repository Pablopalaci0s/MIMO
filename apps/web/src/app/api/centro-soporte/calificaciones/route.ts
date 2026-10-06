import { NextRequest } from "next/server";
import { supportRatingsQuerySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { getSupportRatings } from "@/lib/services/support-ratings-service";

/**
 * Calificaciones (CSAT / DSAT). Cada agente ve solo las suyas; supervisión y
 * administración pueden elegir a una persona o ver todo el equipo.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-calificaciones", 120, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const query = supportRatingsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await getSupportRatings(actor, query));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
