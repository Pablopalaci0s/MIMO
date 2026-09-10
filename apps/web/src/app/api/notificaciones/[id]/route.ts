import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { markNotificationRead } from "@/lib/services/notification-service";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    await markNotificationRead(session.user.id, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
