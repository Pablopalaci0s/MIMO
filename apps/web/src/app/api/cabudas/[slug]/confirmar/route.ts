import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { confirmContribution } from "@/lib/services/group-gift-service";

const bodySchema = z.object({
  contributionId: z.string().uuid(),
  paypalOrderId: z.string().trim().min(1),
});

/** Paso 2 de aportar: el comprador ya aprobó en el popup de PayPal — acá
 * se captura el cobro real. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contributionId, paypalOrderId } = bodySchema.parse(body);

    await confirmContribution(contributionId, paypalOrderId);
    return apiSuccess({ contributionId });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
