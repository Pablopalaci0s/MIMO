import { NextRequest } from "next/server";
import { reserveGiftSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { getPublicRegistry, reserveGiftItem } from "@/lib/services/gift-registry-service";

/**
 * Sin login — cualquiera con el link puede reservar un regalo (esa es la
 * gracia de una lista pública). Rate-limit por IP para que nadie reserve
 * (o intente) todos los regalos de una lista como broma.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const limited = rateLimitResponse(request, "reservar-regalo", 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { slug } = await params;
    const body = await request.json();
    const { reservedByName } = reserveGiftSchema.parse(body);
    const { itemId } = body as { itemId?: string };
    if (typeof itemId !== "string") return apiError("VALIDATION_ERROR", "Falta el regalo a reservar.", 400);

    const registry = await getPublicRegistry(slug);
    if (!registry) return apiError("NOT_FOUND", "No encontramos esa lista.", 404);
    if (!registry.items.some((item) => item.id === itemId)) {
      return apiError("NOT_FOUND", "Ese regalo no pertenece a esta lista.", 404);
    }

    await reserveGiftItem(itemId, reservedByName);
    return apiSuccess({ itemId });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
