import { NextRequest } from "next/server";
import { supportRateSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { rateConversation } from "@/lib/services/support-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const limited = rateLimitResponse(request, "soporte-calificar", 20, 60 * 60 * 1000, userId ?? undefined);
    if (limited) return limited;

    const input = supportRateSchema.parse(await request.json());
    await rateConversation({ ...input, userId });
    return apiSuccess({ rated: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
