import { NextRequest } from "next/server";
import { supportMetricsQuerySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { getSupportMetrics } from "@/lib/services/support-metrics-service";

/** Métricas del centro de soporte: solo supervisión y administración. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    const limited = rateLimitResponse(request, "centro-soporte-metricas", 120, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const { days } = supportMetricsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await getSupportMetrics(days));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
