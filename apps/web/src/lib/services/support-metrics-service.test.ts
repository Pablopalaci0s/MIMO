import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Las consultas (conteos, agrupaciones y los dos promedios en SQL) las resuelve
 * la base real; acá se prueba lo NUESTRO: cómo se interpretan y se combinan
 * (minutos, porcentajes, nombres, CSAT, valores vacíos). Los promedios reales
 * también se comprobaron contra la base con tiempos conocidos en la prueba en
 * navegador.
 */

const state = vi.hoisted(() => ({
  statusGroups: [] as { status: string; _count: { _all: number } }[],
  firstResponseSeconds: null as number | null,
  resolutionSeconds: null as number | null,
  openByAgent: [] as { assignedAgentId: string | null; _count: { _all: number } }[],
  resolvedByAgent: [] as { assignedAgentId: string | null; _count: { _all: number } }[],
  byCategory: [] as { categoryId: string; _count: { _all: number } }[],
  created: 0,
  resolved: 0,
  escalatedByBot: 0,
  urgent: 0,
  resolvedByBot: 0,
  csat: { avg: null as number | null, count: 0 },
  ratingGroups: [] as { rating: number | null; _count: { _all: number } }[],
  createdByDay: [] as { day: string; n: number }[],
  resolvedByDay: [] as { day: string; n: number }[],
  previousCreated: 0,
  previousResolved: 0,
  priorityGroups: [] as { priority: string; _count: { _all: number } }[],
}));

vi.mock("@mimo/database", () => ({
  Prisma: { sql: (strings: TemplateStringsArray) => strings.join("?") },
  prisma: {
    supportTicket: {
      groupBy: vi.fn(async (args: { by: string[]; where: Record<string, unknown> }) => {
        if (args.by[0] === "status") return state.statusGroups;
        if (args.by[0] === "categoryId") return state.byCategory;
        if (args.by[0] === "priority") return state.priorityGroups;
        return "resolvedAt" in args.where ? state.resolvedByAgent : state.openByAgent;
      }),
      count: vi.fn(async (args: { where: Record<string, unknown> }) => {
        const createdWindow = args.where.createdAt as { lt?: Date } | undefined;
        const resolvedWindow = args.where.resolvedAt as { lt?: Date } | undefined;
        if (createdWindow?.lt) return state.previousCreated;
        if (resolvedWindow?.lt) return state.previousResolved;
        if (args.where.priority === "URGENT") return state.urgent;
        if (args.where.escalatedFromBot === true) return state.escalatedByBot;
        if ("resolvedAt" in args.where) return state.resolved;
        return state.created;
      }),
    },
    $queryRaw: vi.fn(async (query: string) => {
      if (query.includes("to_char")) return query.includes('"createdAt" AT TIME ZONE') ? state.createdByDay : state.resolvedByDay;
      return query.includes('"firstResponseAt" IS NOT NULL') ? [{ seconds: state.firstResponseSeconds }] : [{ seconds: state.resolutionSeconds }];
    }),
    user: { findMany: vi.fn(async () => [{ id: "agent-1", name: "Ana Agente" }, { id: "agent-2", name: "Beto Agente" }]) },
    supportCategory: {
      findMany: vi.fn(async () => [
        { id: "c-pago", slug: "pago", name: "Pago" },
        { id: "c-entrega", slug: "entrega", name: "Entrega" },
      ]),
    },
    supportConversation: {
      count: vi.fn(async () => state.resolvedByBot),
      aggregate: vi.fn(async () => ({ _avg: { rating: state.csat.avg }, _count: { rating: state.csat.count } })),
      groupBy: vi.fn(async () => state.ratingGroups),
    },
  },
}));

const { getSupportMetrics } = await import("./support-metrics-service");
const { svDayKey } = await import("@/lib/support/ticket-rules");

beforeEach(() => {
  Object.assign(state, {
    statusGroups: [],
    firstResponseSeconds: null,
    resolutionSeconds: null,
    openByAgent: [],
    resolvedByAgent: [],
    byCategory: [],
    created: 0,
    resolved: 0,
    escalatedByBot: 0,
    urgent: 0,
    resolvedByBot: 0,
    csat: { avg: null, count: 0 },
    ratingGroups: [],
    createdByDay: [],
    resolvedByDay: [],
    previousCreated: 0,
    previousResolved: 0,
    priorityGroups: [],
  });
});

describe("métricas del centro de soporte", () => {
  it("sin ningún dato todo es 0 o «sin datos» (nunca NaN ni un 0 que parezca real)", async () => {
    const metrics = await getSupportMetrics(30);
    expect(metrics).toMatchObject({
      rangeDays: 30,
      created: 0,
      open: 0,
      pending: 0,
      urgent: 0,
      resolved: 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      botResolutionRate: null,
      csat: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
      previous: { created: 0, resolved: 0 },
      byPriority: { LOW: 0, NORMAL: 0, HIGH: 0, URGENT: 0 },
      byAgent: [],
      byCategory: [],
    });
    expect(Object.values(metrics.byStatus).every((n) => n === 0)).toBe(true);
  });

  it("abiertos = todo lo activo; pendientes = NEW + OPEN; los resueltos y cerrados no cuentan como abiertos", async () => {
    state.statusGroups = [
      { status: "NEW", _count: { _all: 3 } },
      { status: "OPEN", _count: { _all: 2 } },
      { status: "IN_PROGRESS", _count: { _all: 4 } },
      { status: "WAITING_CUSTOMER", _count: { _all: 1 } },
      { status: "ESCALATED", _count: { _all: 1 } },
      { status: "RESOLVED", _count: { _all: 10 } },
      { status: "CLOSED", _count: { _all: 20 } },
    ];
    const metrics = await getSupportMetrics(30);
    expect(metrics.open).toBe(3 + 2 + 4 + 1 + 1);
    expect(metrics.pending).toBe(5);
    expect(metrics.byStatus).toMatchObject({ NEW: 3, RESOLVED: 10, CLOSED: 20, WAITING_BUSINESS: 0 });
  });

  it("convierte los tiempos medios de segundos a minutos (primera respuesta y resolución)", async () => {
    state.firstResponseSeconds = 750; // 12,5 min
    state.resolutionSeconds = 4_980; // 83 min
    const metrics = await getSupportMetrics(7);
    expect(metrics.avgFirstResponseMinutes).toBe(12.5);
    expect(metrics.avgResolutionMinutes).toBe(83);
    expect(metrics.rangeDays).toBe(7);
  });

  it("CSAT: promedio con 2 decimales y cantidad de calificaciones", async () => {
    state.csat = { avg: 4.3333333, count: 3 };
    state.ratingGroups = [
      { rating: 4, _count: { _all: 2 } },
      { rating: 5, _count: { _all: 1 } },
    ];
    expect((await getSupportMetrics(30)).csat).toEqual({ average: 4.33, count: 3, distribution: [0, 0, 0, 2, 1] });
  });

  it("la serie diaria trae un punto por día del período (sin huecos) con los creados y resueltos de cada día", async () => {
    const today = svDayKey(Date.now());
    state.createdByDay = [{ day: today, n: 4 }];
    state.resolvedByDay = [{ day: today, n: 2 }];
    const { daily } = await getSupportMetrics(7);
    expect(daily).toHaveLength(7);
    expect(daily.at(-1)).toEqual({ date: today, created: 4, resolved: 2 });
    expect(daily.slice(0, -1).every((day) => day.created === 0 && day.resolved === 0)).toBe(true);
  });

  it("el período anterior y la prioridad de lo abierto se cargan para comparar", async () => {
    state.previousCreated = 9;
    state.previousResolved = 5;
    state.priorityGroups = [
      { priority: "HIGH", _count: { _all: 3 } },
      { priority: "URGENT", _count: { _all: 1 } },
    ];
    const metrics = await getSupportMetrics(30);
    expect(metrics.previous).toEqual({ created: 9, resolved: 5 });
    expect(metrics.byPriority).toEqual({ LOW: 0, NORMAL: 0, HIGH: 3, URGENT: 1 });
  });

  it("% resuelto por el asistente vs. por personas, y tickets escalados por el asistente", async () => {
    state.resolvedByBot = 6;
    state.resolved = 2;
    state.escalatedByBot = 5;
    const metrics = await getSupportMetrics(30);
    expect(metrics).toMatchObject({ resolvedByBot: 6, resolvedByHuman: 2, escalatedByBot: 5, botResolutionRate: 75 });
  });

  it("por agente: junta abiertos y resueltos de la misma persona, pone el nombre y ordena por carga; «Sin asignar» aparte", async () => {
    state.openByAgent = [
      { assignedAgentId: "agent-1", _count: { _all: 2 } },
      { assignedAgentId: null, _count: { _all: 4 } },
    ];
    state.resolvedByAgent = [
      { assignedAgentId: "agent-1", _count: { _all: 5 } },
      { assignedAgentId: "agent-2", _count: { _all: 1 } },
    ];
    const { byAgent } = await getSupportMetrics(30);
    expect(byAgent).toEqual([
      { agentId: "agent-1", name: "Ana Agente", open: 2, resolved: 5 },
      { agentId: null, name: "Sin asignar", open: 4, resolved: 0 },
      { agentId: "agent-2", name: "Beto Agente", open: 0, resolved: 1 },
    ]);
  });

  it("por categoría: con nombre, de mayor a menor", async () => {
    state.byCategory = [
      { categoryId: "c-entrega", _count: { _all: 2 } },
      { categoryId: "c-pago", _count: { _all: 9 } },
    ];
    const { byCategory } = await getSupportMetrics(30);
    expect(byCategory).toEqual([
      { slug: "pago", name: "Pago", count: 9 },
      { slug: "entrega", name: "Entrega", count: 2 },
    ]);
  });
});
