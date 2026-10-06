import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { businessPrivacyAcceptSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { acceptPrivacyPolicy } from "@/lib/services/business-privacy-service";
import { requireBusinessId } from "@/lib/services/business-service";

/** El titular acepta la versión vigente de la Política de privacidad (paso previo a subir su DUI). */
export async function POST(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const session = await auth();

    const limited = rateLimitResponse(request, "negocio-privacidad", 10, 60 * 60 * 1000, session!.user.id);
    if (limited) return limited;

    const input = businessPrivacyAcceptSchema.parse(await request.json());
    await acceptPrivacyPolicy(businessId, input.version);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
