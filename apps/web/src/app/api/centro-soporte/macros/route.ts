import { NextRequest } from "next/server";
import { supportMacroInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { isManager } from "@/lib/support/ticket-rules";
import { createMacro, listMacros } from "@/lib/services/support-config-service";
import { requireSupportStaff } from "@/lib/services/support-access-service";

/** Todo el personal lee las respuestas rápidas activas; supervisión ve también las desactivadas. */
export async function GET() {
  try {
    const actor = await requireSupportStaff();
    return apiSuccess(await listMacros({ includeInactive: isManager(actor) }));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    const limited = rateLimitResponse(request, "centro-soporte-macros", 60, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const input = supportMacroInputSchema.parse(await request.json());
    return apiSuccess(await createMacro(actor, input), 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
