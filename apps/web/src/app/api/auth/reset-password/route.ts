import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { resetPassword } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "reset-password", 10, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const input = resetPasswordSchema.parse(body);

    await resetPassword(input.token, input.password);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
