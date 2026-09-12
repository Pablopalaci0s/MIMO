import { NextRequest } from "next/server";
import { contributeToGroupGiftSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { createContributionOrder } from "@/lib/services/group-gift-service";

/**
 * Sin login — crea la orden de PayPal por el monto que la persona quiere
 * aportar (paso 1 de 2, ver `confirmar/route.ts`). Rate-limit por IP.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const limited = rateLimitResponse(request, "aportar-colecta", 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { slug } = await params;
    const body = await request.json();
    const input = contributeToGroupGiftSchema.parse(body);

    const result = await createContributionOrder(slug, input);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
