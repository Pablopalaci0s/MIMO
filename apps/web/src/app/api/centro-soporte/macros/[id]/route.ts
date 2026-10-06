import { NextRequest } from "next/server";
import { z } from "zod";
import { supportMacroUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { deleteMacro, updateMacro } from "@/lib/services/support-config-service";
import { requireSupportStaff } from "@/lib/services/support-access-service";

const idSchema = z.string().uuid("Respuesta inválida");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    const limited = rateLimitResponse(request, "centro-soporte-macros", 60, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const input = supportMacroUpdateSchema.parse(await request.json());
    return apiSuccess(await updateMacro(actor, idSchema.parse((await params).id), input));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff({ manager: true });
    await deleteMacro(actor, idSchema.parse((await params).id));
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
