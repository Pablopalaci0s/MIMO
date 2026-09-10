import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listNotifications, markAllNotificationsRead } from "@/lib/services/notification-service";
import { checkImportantDateReminders } from "@/lib/services/important-date-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    await checkImportantDateReminders(session.user.id);
    const notifications = await listNotifications(session.user.id);
    return apiSuccess(notifications);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    await markAllNotificationsRead(session.user.id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
