import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requestPasswordReset } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "forgot-password", 5, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const input = forgotPasswordSchema.parse(body);

    await requestPasswordReset(input.email);
    // Misma respuesta exista o no la cuenta — ver el comentario en
    // requestPasswordReset sobre no enumerar cuentas por correo.
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
