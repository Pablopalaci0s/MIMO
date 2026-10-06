import { NextRequest } from "next/server";
import { supportCategoryInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { isManager } from "@/lib/support/ticket-rules";
import { createCategory, listCategories } from "@/lib/services/support-config-service";
import { requireSupportStaff } from "@/lib/services/support-access-service";

export async function GET() {
  try {
    const actor = await requireSupportStaff();
    return apiSuccess(await listCategories({ includeInactive: isManager(actor) }));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    const limited = rateLimitResponse(request, "centro-soporte-categorias", 60, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const input = supportCategoryInputSchema.parse(await request.json());
    return apiSuccess(await createCategory(actor, input), 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
