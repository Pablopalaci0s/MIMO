import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { revealOrderAddress } from "@/lib/services/support-ticket-service";

/**
 * Revela la dirección de entrega del pedido del ticket. POST (y no GET) a
 * propósito: cada llamada deja una entrada en la auditoría, así que no debe
 * poder dispararse por una precarga o un enlace.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-direccion", 60, 60 * 60 * 1000, actor.id);
    if (limited) return limited;

    const id = z.string().uuid("Ticket inválido").parse((await params).id);
    return apiSuccess(await revealOrderAddress(actor, id));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
