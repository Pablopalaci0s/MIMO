import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { supportRequestSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { createTicketFromForm } from "@/lib/services/support-ticket-intake-service";

/**
 * Formulario de contacto de /ayuda: ahora abre un TICKET (antes solo mandaba
 * un correo). Si quien escribe tiene sesión, el ticket queda en su cuenta; el
 * `userId` sale de la sesión del servidor, nunca del cuerpo del request.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "support-request", 3, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const input = supportRequestSchema.parse(body);
    const session = await auth();

    const { code } = await createTicketFromForm({ ...input, userId: session?.user?.id ?? null });
    return apiSuccess({ ok: true, ticketCode: code });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
