import { Prisma, prisma } from "@mimo/database";
import type { SupportMetricsDTO, SupportTicketPriority, SupportTicketStatus } from "@mimo/types";
import { ACTIVE_STATUSES, botResolutionRate, buildDailySeries, ratingDistribution, secondsToMinutes } from "@/lib/support/ticket-rules";

/**
 * Métricas de la primera versión del centro de soporte (solo supervisión y
 * administración). Todo se calcula con agregados en la base — conteos,
 * `groupBy` y dos promedios en SQL — nunca trayendo los tickets a memoria.
 *
 * Definiciones (para no discutir qué significa cada número):
 *  - creados: tickets que nacieron en el período.
 *  - abiertos: tickets activos AHORA (todo menos resueltos y cerrados).
 *  - pendientes: activos sin atender todavía (NEW y OPEN) AHORA.
 *  - urgentes: activos AHORA con prioridad URGENT.
 *  - resueltos: tickets cuya última resolución cae en el período.
 *  - primera respuesta: de la creación a la primera respuesta pública de una persona.
 *  - resolución: de la creación a la resolución.
 *  - por el asistente: conversaciones que la persona cerró sin pasar a una persona.
 *  - CSAT: promedio de las calificaciones dejadas en el período.
 *  - diario: creados y resueltos por día calendario de El Salvador (UTC-6).
 *  - anterior: el mismo largo de período justo antes, para comparar.
 */

export async function getSupportMetrics(days: number): Promise<SupportMetricsDTO> {
  const now = Date.now();
  const since = new Date(now - days * 24 * 60 * 60 * 1000);
  const previousSince = new Date(now - 2 * days * 24 * 60 * 60 * 1000);
  const customer = { kind: "CUSTOMER" as const };

  const [
    statusGroups,
    created,
    resolved,
    escalatedByBot,
    firstResponseAvg,
    resolutionAvg,
    openByAgent,
    resolvedByAgent,
    byCategoryGroups,
    resolvedByBot,
    csat,
    ratingGroups,
    createdByDay,
    resolvedByDay,
    previousCreated,
    previousResolved,
    priorityGroups,
  ] = await Promise.all([
    prisma.supportTicket.groupBy({ by: ["status"], where: customer, _count: { _all: true } }),
    prisma.supportTicket.count({ where: { ...customer, createdAt: { gte: since } } }),
    prisma.supportTicket.count({ where: { ...customer, resolvedAt: { gte: since } } }),
    prisma.supportTicket.count({ where: { ...customer, createdAt: { gte: since }, escalatedFromBot: true } }),
    prisma.$queryRaw<{ seconds: number | null }[]>(Prisma.sql`
      SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")))::float AS seconds
      FROM "support_tickets"
      WHERE "kind" = 'CUSTOMER'::"SupportTicketKind" AND "firstResponseAt" IS NOT NULL AND "createdAt" >= ${since}`),
    prisma.$queryRaw<{ seconds: number | null }[]>(Prisma.sql`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float AS seconds
      FROM "support_tickets"
      WHERE "kind" = 'CUSTOMER'::"SupportTicketKind" AND "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${since}`),
    prisma.supportTicket.groupBy({ by: ["assignedAgentId"], where: { ...customer, status: { in: ACTIVE_STATUSES } }, _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["assignedAgentId"], where: { ...customer, resolvedAt: { gte: since } }, _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["categoryId"], where: { ...customer, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.supportConversation.count({
      where: {
        escalatedAt: null,
        status: "RESOLVED",
        resolvedAt: { gte: since },
        // Que de verdad haya habido una conversación (la persona escribió algo).
        messages: { some: { role: "USER" } },
      },
    }),
    prisma.supportConversation.aggregate({
      where: {
        rating: { not: null },
        ticket: { isNot: null },
        OR: [{ ratedAt: { gte: since } }, { ratedAt: null, resolvedAt: { gte: since } }],
      },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.supportConversation.groupBy({
      by: ["rating"],
      where: {
        rating: { not: null },
        ticket: { isNot: null },
        OR: [{ ratedAt: { gte: since } }, { ratedAt: null, resolvedAt: { gte: since } }],
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ day: string; n: number }[]>(Prisma.sql`
      SELECT to_char(("createdAt" AT TIME ZONE 'America/El_Salvador')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "support_tickets"
      WHERE "kind" = 'CUSTOMER'::"SupportTicketKind" AND "createdAt" >= ${since}
      GROUP BY 1`),
    prisma.$queryRaw<{ day: string; n: number }[]>(Prisma.sql`
      SELECT to_char(("resolvedAt" AT TIME ZONE 'America/El_Salvador')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "support_tickets"
      WHERE "kind" = 'CUSTOMER'::"SupportTicketKind" AND "resolvedAt" >= ${since}
      GROUP BY 1`),
    prisma.supportTicket.count({ where: { ...customer, createdAt: { gte: previousSince, lt: since } } }),
    prisma.supportTicket.count({ where: { ...customer, resolvedAt: { gte: previousSince, lt: since } } }),
    prisma.supportTicket.groupBy({ by: ["priority"], where: { ...customer, status: { in: ACTIVE_STATUSES } }, _count: { _all: true } }),
  ]);

  const byStatus = Object.fromEntries(
    (["NEW", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS", "ESCALATED", "RESOLVED", "CLOSED"] as SupportTicketStatus[]).map(
      (status) => [status, statusGroups.find((group) => group.status === status)?._count._all ?? 0],
    ),
  ) as Record<SupportTicketStatus, number>;

  const open = ACTIVE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
  const urgent = await prisma.supportTicket.count({ where: { ...customer, priority: "URGENT", status: { in: ACTIVE_STATUSES } } });

  // Nombres de agentes y categorías en UNA consulta cada uno (no una por fila).
  const agentIds = [...new Set([...openByAgent, ...resolvedByAgent].map((row) => row.assignedAgentId).filter((id): id is string => id !== null))];
  const [agents, categories] = await Promise.all([
    agentIds.length > 0 ? prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    prisma.supportCategory.findMany({ select: { id: true, slug: true, name: true } }),
  ]);
  const agentName = new Map(agents.map((agent) => [agent.id, agent.name]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const agentRows = new Map<string | null, { open: number; resolved: number }>();
  for (const row of openByAgent) agentRows.set(row.assignedAgentId, { open: row._count._all, resolved: 0 });
  for (const row of resolvedByAgent) {
    const current = agentRows.get(row.assignedAgentId) ?? { open: 0, resolved: 0 };
    agentRows.set(row.assignedAgentId, { ...current, resolved: row._count._all });
  }

  return {
    rangeDays: days,
    byStatus,
    created,
    open,
    resolved,
    pending: byStatus.NEW + byStatus.OPEN,
    urgent,
    avgFirstResponseMinutes: secondsToMinutes(firstResponseAvg[0]?.seconds ?? null),
    avgResolutionMinutes: secondsToMinutes(resolutionAvg[0]?.seconds ?? null),
    byAgent: [...agentRows.entries()]
      .map(([agentId, counts]) => ({
        agentId,
        name: agentId ? (agentName.get(agentId) ?? "Persona eliminada") : "Sin asignar",
        ...counts,
      }))
      .sort((a, b) => b.open + b.resolved - (a.open + a.resolved)),
    byCategory: byCategoryGroups
      .map((group) => ({
        slug: categoryById.get(group.categoryId)?.slug ?? "otro",
        name: categoryById.get(group.categoryId)?.name ?? "Otro",
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    escalatedByBot,
    resolvedByBot,
    resolvedByHuman: resolved,
    botResolutionRate: botResolutionRate(resolvedByBot, resolved),
    csat: {
      average: csat._avg.rating === null ? null : Math.round(csat._avg.rating * 100) / 100,
      count: csat._count.rating,
      distribution: ratingDistribution(ratingGroups.map((group) => ({ rating: group.rating, count: group._count._all }))),
    },
    daily: buildDailySeries(days, now, createdByDay, resolvedByDay),
    previous: { created: previousCreated, resolved: previousResolved },
    byPriority: Object.fromEntries(
      (["LOW", "NORMAL", "HIGH", "URGENT"] as SupportTicketPriority[]).map((priority) => [
        priority,
        priorityGroups.find((group) => group.priority === priority)?._count._all ?? 0,
      ]),
    ) as Record<SupportTicketPriority, number>,
  };
}
