import { NextRequest } from "next/server";
import { supportTicketListQuerySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { listTickets } from "@/lib/services/support-ticket-service";

/** Bandeja de tickets (paginada, con filtros y contadores por cola). El alcance lo decide el servidor según el rol. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSupportStaff();
    const limited = rateLimitResponse(request, "centro-soporte-lista", 400, 10 * 60 * 1000, actor.id);
    if (limited) return limited;

    // Los campos vacíos del formulario de filtros ("") significan "sin filtro".
    const params = Object.fromEntries([...request.nextUrl.searchParams.entries()].filter(([, value]) => value !== ""));
    const query = supportTicketListQuerySchema.parse(params);
    return apiSuccess(await listTickets(actor, query));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
