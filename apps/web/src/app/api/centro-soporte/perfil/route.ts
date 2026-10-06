import { NextRequest } from "next/server";
import { supportUsernameInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { getSupportProfile, setSupportUsername } from "@/lib/services/support-profile-service";

/** El perfil de quien está logueado (nunca el de otra persona: el id sale de la sesión). */
export async function GET() {
  try {
    const actor = await requireSupportStaff();
    return apiSuccess(await getSupportProfile(actor));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

/** Elige el nombre de usuario. Solo funciona la primera vez: después responde 409 y no cambia nada. */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-perfil", 20, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const input = supportUsernameInputSchema.parse(await request.json());
    return apiSuccess(await setSupportUsername(actor, input.username));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
