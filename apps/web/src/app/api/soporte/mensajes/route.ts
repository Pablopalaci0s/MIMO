import { NextRequest } from "next/server";
import { supportSendMessageSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { sendUserMessage } from "@/lib/services/support-service";

const TEN_MINUTES = 10 * 60 * 1000;

/** Sin login también se puede preguntar: el límite es por IP para visitantes
 * (más bajo) y por cuenta para quien inició sesión. Cada mensaje puede
 * costar una llamada a la IA, así que este es el límite que más importa. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const limited = rateLimitResponse(request, "soporte-mensaje", userId ? 30 : 15, TEN_MINUTES, userId ?? undefined);
    if (limited) return limited;

    const input = supportSendMessageSchema.parse(await request.json());
    const conversation = await sendUserMessage({
      conversationId: input.conversationId,
      userId,
      userName: session?.user?.name ?? null,
      text: input.message,
      pagePath: input.pagePath,
    });
    return apiSuccess({ conversation });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
