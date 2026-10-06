import { NextRequest } from "next/server";
import { z } from "zod";
import { supportCategoryUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { updateCategory } from "@/lib/services/support-config-service";
import { requireSupportStaff } from "@/lib/services/support-access-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    const limited = rateLimitResponse(request, "centro-soporte-categorias", 60, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = z.string().uuid("Categoría inválida").parse((await params).id);
    const input = supportCategoryUpdateSchema.parse(await request.json());
    return apiSuccess(await updateCategory(actor, id, input));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
