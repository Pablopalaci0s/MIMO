import { NextRequest } from "next/server";
import { supportConversationRefSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { closeBotConversation } from "@/lib/services/support-service";

/** "Nueva conversación": cierra la que atiende el asistente. Una que ya está
 * con una persona del equipo no se cierra desde acá. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const limited = rateLimitResponse(request, "soporte-cerrar", 30, 60 * 60 * 1000, userId ?? undefined);
    if (limited) return limited;

    const input = supportConversationRefSchema.parse(await request.json());
    await closeBotConversation({ conversationId: input.conversationId, userId });
    return apiSuccess({ closed: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
