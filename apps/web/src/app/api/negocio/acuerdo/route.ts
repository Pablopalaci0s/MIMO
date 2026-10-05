import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { businessAgreementAcceptSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { acceptAgreement } from "@/lib/services/business-agreement-service";
import { requireBusinessId } from "@/lib/services/business-service";

/** Un negocio ya registrado acepta la versión vigente del acuerdo (cuando se
 * publica una versión nueva, o si se registró antes de que existiera). */
export async function POST(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const session = await auth();

    const limited = rateLimitResponse(request, "negocio-acuerdo", 10, 60 * 60 * 1000, session!.user.id);
    if (limited) return limited;

    const input = businessAgreementAcceptSchema.parse(await request.json());
    await acceptAgreement(businessId, session!.user.id, input.version);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
