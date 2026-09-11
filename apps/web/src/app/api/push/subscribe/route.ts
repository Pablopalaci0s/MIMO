import { NextRequest } from "next/server";
import { webPushSubscriptionSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { saveWebPushSubscription } from "@/lib/services/push-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const subscription = webPushSubscriptionSchema.parse(body);

    await saveWebPushSubscription(session.user.id, subscription);
    return apiSuccess({ subscribed: true }, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
