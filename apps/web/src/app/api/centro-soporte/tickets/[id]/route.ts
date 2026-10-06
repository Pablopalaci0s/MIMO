import { NextRequest } from "next/server";
import { z } from "zod";
import { supportTicketActionSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { getTicketDetail, performTicketAction } from "@/lib/services/support-ticket-service";

const idSchema = z.string().uuid("Ticket inválido");

/** Detalle del ticket + contexto (cliente, pedido, negocio, historial). 404 si el actor no lo puede ver. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-detalle", 400, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = idSchema.parse((await params).id);
    return apiSuccess(await getTicketDetail(actor, id));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

/**
 * Acciones sobre el ticket (tomar, liberar, asignar, estado, prioridad,
 * categoría, vincular pedido/negocio, escalar). El agente que actúa SALE DE LA
 * SESIÓN: ningún campo del cuerpo puede suplantarlo ni cambiar permisos.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-accion", 200, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = idSchema.parse((await params).id);
    const input = supportTicketActionSchema.parse(await request.json());
    await performTicketAction(actor, id, input);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
