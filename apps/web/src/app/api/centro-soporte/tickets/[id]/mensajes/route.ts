import { NextRequest } from "next/server";
import { z } from "zod";
import { supportTicketMessageSchema, supportTicketMessagesQuerySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { listTicketMessages, postTicketMessage } from "@/lib/services/support-ticket-service";

const idSchema = z.string().uuid("Ticket inválido");

/** Mensajes del ticket por bloques (incluye notas internas: solo llega acá quien puede ver el ticket). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff();
    // Polling de la conversación abierta (cada pocos segundos): límite holgado pero finito.
    const limited = rateLimitResponse(request, "centro-soporte-mensajes", 900, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = idSchema.parse((await params).id);
    const cursor = supportTicketMessagesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await listTicketMessages(actor, id, cursor));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

/** Responde al cliente (`kind: "reply"`) o agrega una nota interna (`kind: "note"`). La visibilidad la decide el servidor por el tipo. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-enviar", 90, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = idSchema.parse((await params).id);
    const input = supportTicketMessageSchema.parse(await request.json());
    return apiSuccess(await postTicketMessage(actor, id, input), 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
