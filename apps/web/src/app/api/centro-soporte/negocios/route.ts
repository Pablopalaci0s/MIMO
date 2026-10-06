import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { searchBusinessesForLinking } from "@/lib/services/support-context-service";

const querySchema = z.object({ q: z.string().trim().min(2, "Escribí al menos 2 letras").max(60) });

/** Busca negocios por nombre para vincularlos a un ticket. Solo personal de soporte. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-negocios", 200, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const { q } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await searchBusinessesForLinking(q));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
