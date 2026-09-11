import { prisma } from "@mimo/database";
import webpush from "web-push";
import { logger } from "@/lib/logger";

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Sin ambas claves VAPID configuradas, todo lo de acá es un no-op — mismo
 * patrón de degradación que AIService/Resend/Sentry en este proyecto. */
function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;
function ensureVapidConfigured(): void {
  if (vapidReady || !isConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@mimo.sv",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidReady = true;
}

export async function saveWebPushSubscription(
  userId: string,
  subscription: WebPushSubscriptionInput,
): Promise<void> {
  await prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removeWebPushSubscription(endpoint: string): Promise<void> {
  await prisma.webPushSubscription.deleteMany({ where: { endpoint } });
}

/**
 * Manda un push a todas las suscripciones del usuario. Se llama desde
 * `createNotification` — un solo punto de integración para que cada tipo de
 * notificación (pedido, reseña, fecha importante...) también llegue como
 * push sin tener que tocar cada call site. Si `webpush.sendNotification`
 * devuelve 404/410 (suscripción vencida — el navegador la invalidó), se
 * borra: no tiene sentido seguir intentándole a un endpoint muerto.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!isConfigured()) return;
  ensureVapidConfigured();

  const subscriptions = await prisma.webPushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeWebPushSubscription(subscription.endpoint);
          return;
        }
        logger.error("[push] no se pudo enviar la notificación", {
          userId,
          statusCode,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}
