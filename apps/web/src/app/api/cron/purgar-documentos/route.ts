import { NextRequest } from "next/server";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { purgeExpiredBusinessDocuments, purgeVerifiedIdentityImages } from "@/lib/services/business-document-service";

/**
 * Borra los documentos de identidad (DUI) cuyo plazo de conservación venció
 * (negocios rechazados o dados de baja) — ver Política de privacidad y
 * `purgeExpiredBusinessDocuments`. Pensado para correr una vez por día desde
 * `.github/workflows/cron-purgar-documentos.yml`; mismo esquema de
 * `CRON_SECRET` que los otros crons.
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

    // Dos plazos distintos: negocios rechazados/dados de baja, e imágenes de
    // identidad de negocios ya verificados. Ver `lib/legal/privacy.ts`.
    const expired = await purgeExpiredBusinessDocuments();
    const verified = await purgeVerifiedIdentityImages();
    return apiSuccess({ expired, verified });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
