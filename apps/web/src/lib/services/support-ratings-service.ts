import { Prisma, prisma } from "@mimo/database";
import type { SupportRatingItemDTO, SupportRatingsDTO, SupportRatingSummaryDTO } from "@mimo/types";
import type { SupportRatingsQuery } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { isManager, ratingDistribution, ratingRangeFor, satisfactionBreakdown, ticketCode, type StaffActor } from "@/lib/support/ticket-rules";

/**
 * Calificaciones de los clientes (CSAT / DSAT) por persona.
 *
 *  - Un agente ve SOLO las suyas: el alcance lo decide el servidor, el cliente
 *    no puede pedir las de otra persona (si lo intenta, 403).
 *  - Supervisión y administración ven las de cualquier agente o las de todo el equipo.
 *  - Una calificación es de quien tiene asignado el ticket.
 *  - CSAT = % de 4–5 ★ · DSAT = % de 1–2 ★ · 3 ★ es neutral.
 */

const ITEMS_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function periodWhere(agentId: string | null, from: Date, to?: Date): Prisma.SupportConversationWhereInput {
  const window = { gte: from, ...(to ? { lt: to } : {}) };
  return {
    rating: { not: null },
    ticket: agentId ? { is: { assignedAgentId: agentId } } : { isNot: null },
    // Las calificaciones anteriores a que existiera `ratedAt` caen por la fecha de resolución.
    OR: [{ ratedAt: window }, { ratedAt: null, resolvedAt: window }],
  };
}

async function summaryFor(where: Prisma.SupportConversationWhereInput): Promise<SupportRatingSummaryDTO> {
  const groups = await prisma.supportConversation.groupBy({ by: ["rating"], where, _count: { _all: true } });
  const distribution = ratingDistribution(groups.map((group) => ({ rating: group.rating, count: group._count._all })));
  return { ...satisfactionBreakdown(distribution), distribution };
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "Cliente";
}

export async function getSupportRatings(actor: StaffActor, query: SupportRatingsQuery): Promise<SupportRatingsDTO> {
  const manager = isManager(actor);

  // Quién se mira: el agente, siempre él mismo; la supervisión, quien elija o todo el equipo.
  let agentId: string | null;
  let label: string;
  let agents: SupportRatingsDTO["agents"] = [];
  if (!manager) {
    if (query.agent && query.agent !== actor.id) {
      throw new AppError("FORBIDDEN", "Solo podés ver tus propias calificaciones.", 403);
    }
    agentId = actor.id;
    label = "Tus calificaciones";
  } else {
    const staff = await prisma.user.findMany({
      where: { deletedAt: null, role: { in: ["SUPPORT_AGENT", "SUPPORT_MANAGER"] } },
      select: { id: true, name: true, supportUsername: true },
      orderBy: { name: "asc" },
    });
    agents = staff.map((member) => ({ id: member.id, name: member.name ?? "Sin nombre", username: member.supportUsername }));
    if (query.agent) {
      const chosen = agents.find((member) => member.id === query.agent);
      if (!chosen) throw new AppError("NOT_FOUND", "No encontramos a esa persona en el equipo de soporte.", 404);
      agentId = chosen.id;
      label = chosen.name;
    } else {
      agentId = null;
      label = "Todo el equipo";
    }
  }

  const now = Date.now();
  const since = new Date(now - query.days * DAY_MS);
  const previousSince = new Date(now - 2 * query.days * DAY_MS);
  const current = periodWhere(agentId, since);
  const range = ratingRangeFor(query.kind);

  const listWhere: Prisma.SupportConversationWhereInput = { AND: [current, { rating: { gte: range.gte, lte: range.lte } }] };
  const [summary, previous, matching, rows] = await Promise.all([
    summaryFor(current),
    summaryFor(periodWhere(agentId, previousSince, since)),
    prisma.supportConversation.count({ where: listWhere }),
    prisma.supportConversation.findMany({
      where: listWhere,
      orderBy: [{ ratedAt: { sort: "desc", nulls: "last" } }, { resolvedAt: "desc" }],
      take: ITEMS_LIMIT,
      select: {
        rating: true,
        ratingComment: true,
        ratedAt: true,
        resolvedAt: true,
        ticket: { select: { id: true, number: true, subject: true, category: { select: { name: true } }, customer: { select: { name: true } } } },
        guestName: true,
      },
    }),
  ]);

  const items: SupportRatingItemDTO[] = rows.flatMap((row) => {
    if (!row.ticket || row.rating === null) return [];
    return [
      {
        ticketId: row.ticket.id,
        ticketCode: ticketCode(row.ticket.number),
        subject: row.ticket.subject,
        categoryName: row.ticket.category.name,
        customerName: firstName(row.ticket.customer?.name ?? row.guestName),
        rating: row.rating,
        comment: row.ratingComment,
        ratedAt: (row.ratedAt ?? row.resolvedAt ?? new Date(0)).toISOString(),
      },
    ];
  });

  return {
    rangeDays: query.days,
    scope: { agentId, label, isSelf: agentId === actor.id },
    summary,
    previous,
    kind: query.kind,
    items,
    matching,
    agents,
  };
}
