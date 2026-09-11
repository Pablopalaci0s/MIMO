import { NextRequest } from "next/server";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { checkAllImportantDateReminders } from "@/lib/services/important-date-service";

/**
 * El job programado real que faltaba (ver README "Diseño: fechas
 * importantes recurrentes") — antes el aviso solo se generaba de forma
 * perezosa cuando el usuario abría el home, así que alguien que no entraba
 * a MIMO en la ventana de aviso nunca se enteraba. Pensado para que lo
 * llame un cron externo (`.github/workflows/cron-fechas-importantes.yml`,
 * o el cron nativo de tu hosting una vez elegido) una vez al día — no un
 * usuario ni el navegador.
 *
 * Protegido con `CRON_SECRET`: sin esa variable configurada, la ruta
 * rechaza todo — no hay una versión "abierta" de este endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return apiError("CRON_NOT_CONFIGURED", "CRON_SECRET no está configurado.", 503);
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return apiError("UNAUTHORIZED", "No autorizado", 401);
    }

    const result = await checkAllImportantDateReminders();
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
