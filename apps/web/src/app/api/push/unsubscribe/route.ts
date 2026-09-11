import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { removeWebPushSubscription } from "@/lib/services/push-service";

const unsubscribeSchema = z.object({ endpoint: z.string().trim().url() });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const { endpoint } = unsubscribeSchema.parse(body);

    await removeWebPushSubscription(endpoint);
    return apiSuccess({ subscribed: false });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
