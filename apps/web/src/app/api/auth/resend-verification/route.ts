import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requestEmailVerification } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const limited = rateLimitResponse(request, "resend-verification", 3, 15 * 60 * 1000, session.user.id);
    if (limited) return limited;

    await requestEmailVerification(session.user.id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
