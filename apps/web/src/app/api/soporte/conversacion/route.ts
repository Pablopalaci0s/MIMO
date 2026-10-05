import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { getConversation } from "@/lib/services/support-service";

const idSchema = z.string().uuid().optional();

/** También es el endpoint de "polling" del chat (cada pocos segundos con la
 * conversación abierta), de ahí el límite holgado. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const limited = rateLimitResponse(request, "soporte-leer", 400, 10 * 60 * 1000, userId ?? undefined);
    if (limited) return limited;

    const conversationId = idSchema.parse(request.nextUrl.searchParams.get("id") ?? undefined);
    const conversation = await getConversation({ conversationId, userId });
    return apiSuccess({ conversation });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
