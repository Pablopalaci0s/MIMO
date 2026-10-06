import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Las consultas las resuelve la base; acá se prueba lo NUESTRO: el alcance por
 * rol (un agente solo ve lo suyo), cómo se arma el filtro y cómo se interpretan
 * las estrellas (CSAT / DSAT).
 */

const state = vi.hoisted(() => ({
  current: [] as { rating: number | null; _count: { _all: number } }[],
  previous: [] as { rating: number | null; _count: { _all: number } }[],
  matching: 0,
  rows: [] as Record<string, unknown>[],
  staff: [] as { id: string; name: string | null; supportUsername: string | null }[],
  calls: { groupBy: [] as unknown[], findMany: [] as unknown[], count: [] as unknown[] },
}));

vi.mock("@mimo/database", () => ({
  Prisma: {},
  prisma: {
    supportConversation: {
      groupBy: vi.fn(async (args: { where: { OR: { ratedAt?: { lt?: Date } }[] } }) => {
        state.calls.groupBy.push(args);
        return args.where.OR[0]?.ratedAt?.lt ? state.previous : state.current;
      }),
      count: vi.fn(async (args: unknown) => {
        state.calls.count.push(args);
        return state.matching;
      }),
      findMany: vi.fn(async (args: unknown) => {
        state.calls.findMany.push(args);
        return state.rows;
      }),
    },
    user: { findMany: vi.fn(async () => state.staff) },
  },
}));

const { getSupportRatings } = await import("./support-ratings-service");

const AGENT = { id: "11111111-1111-4111-8111-111111111111", role: "SUPPORT_AGENT" as const };
const OTHER = "22222222-2222-4222-8222-222222222222";
const MANAGER = { id: "33333333-3333-4333-8333-333333333333", role: "SUPPORT_MANAGER" as const };
const ADMIN = { id: "44444444-4444-4444-8444-444444444444", role: "ADMIN" as const };
const query = (extra: Record<string, unknown> = {}) => ({ days: 30, kind: "all" as const, agent: undefined, ...extra }) as Parameters<typeof getSupportRatings>[1];

beforeEach(() => {
  state.current = [];
  state.previous = [];
  state.matching = 0;
  state.rows = [];
  state.staff = [
    { id: AGENT.id, name: "Ana Martínez", supportUsername: "ana.m" },
    { id: OTHER, name: "Beto Rivas", supportUsername: null },
    { id: MANAGER.id, name: "Marta Q", supportUsername: "marta" },
  ];
  state.calls = { groupBy: [], findMany: [], count: [] };
});

const whereOf = (call: unknown) => JSON.stringify((call as { where: unknown }).where);

describe("quién ve qué calificaciones", () => {
  it("un agente ve SOLO las suyas: el filtro lleva su id, sin importar qué mande el cliente", async () => {
    const result = await getSupportRatings(AGENT, query());
    expect(result.scope).toEqual({ agentId: AGENT.id, label: "Tus calificaciones", isSelf: true });
    for (const call of [...state.calls.groupBy, ...state.calls.count, ...state.calls.findMany]) {
      expect(whereOf(call)).toContain(`"assignedAgentId":"${AGENT.id}"`);
    }
    expect(result.agents).toEqual([]);
  });

  it("un agente que pide las de otra persona recibe 403 y no se consulta nada", async () => {
    const error = await getSupportRatings(AGENT, query({ agent: OTHER })).then(() => null, (e: { code?: string; status?: number }) => e);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(state.calls.groupBy).toHaveLength(0);
    expect(state.calls.findMany).toHaveLength(0);
  });

  it("un agente que pide las suyas explícitamente (su propio id) está bien", async () => {
    const result = await getSupportRatings(AGENT, query({ agent: AGENT.id }));
    expect(result.scope.agentId).toBe(AGENT.id);
  });

  it("supervisión y administración: por defecto todo el equipo, con la lista de personas para elegir", async () => {
    for (const actor of [MANAGER, ADMIN]) {
      state.calls = { groupBy: [], findMany: [], count: [] };
      const result = await getSupportRatings(actor, query());
      expect(result.scope).toEqual({ agentId: null, label: "Todo el equipo", isSelf: false });
      expect(result.agents.map((agent) => agent.name)).toEqual(["Ana Martínez", "Beto Rivas", "Marta Q"]);
      expect(whereOf(state.calls.groupBy[0])).not.toContain("assignedAgentId");
    }
  });

  it("supervisión puede elegir a una persona; si no existe en el equipo, 404", async () => {
    const result = await getSupportRatings(MANAGER, query({ agent: OTHER }));
    expect(result.scope).toMatchObject({ agentId: OTHER, label: "Beto Rivas", isSelf: false });
    expect(whereOf(state.calls.groupBy[0])).toContain(`"assignedAgentId":"${OTHER}"`);

    const missing = await getSupportRatings(MANAGER, query({ agent: "99999999-9999-4999-8999-999999999999" })).then(() => null, (e: { code?: string; status?: number }) => e);
    expect(missing).toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
});

describe("lo que se calcula", () => {
  it("CSAT, DSAT, neutrales, promedio y distribución salen de las estrellas", async () => {
    state.current = [
      { rating: 5, _count: { _all: 4 } },
      { rating: 4, _count: { _all: 3 } },
      { rating: 3, _count: { _all: 1 } },
      { rating: 1, _count: { _all: 2 } },
    ];
    const { summary } = await getSupportRatings(AGENT, query());
    expect(summary).toMatchObject({ count: 10, satisfied: 7, neutral: 1, dissatisfied: 2, csatPercent: 70, dsatPercent: 20, average: 3.7 });
    expect(summary.distribution).toEqual([2, 0, 1, 3, 4]);
  });

  it("trae también el período anterior (para comparar) y sin datos todo es null", async () => {
    state.previous = [{ rating: 2, _count: { _all: 5 } }];
    const result = await getSupportRatings(AGENT, query());
    expect(result.summary).toMatchObject({ count: 0, csatPercent: null, average: null });
    expect(result.previous).toMatchObject({ count: 5, dsatPercent: 100 });
  });

  it.each([
    ["good", { gte: 4, lte: 5 }],
    ["neutral", { gte: 3, lte: 3 }],
    ["bad", { gte: 1, lte: 2 }],
    ["all", { gte: 1, lte: 5 }],
  ] as const)("el filtro «%s» pide las estrellas correctas a la base", async (kind, range) => {
    await getSupportRatings(AGENT, query({ kind }));
    const listWhere = JSON.stringify((state.calls.findMany[0] as { where: unknown }).where);
    expect(listWhere).toContain(JSON.stringify({ rating: { gte: range.gte, lte: range.lte } }));
    // el resumen NO se filtra por tipo: siempre muestra el panorama completo
    expect(whereOf(state.calls.groupBy[0])).not.toContain(`"lte":${range.lte}`);
  });

  it("las calificaciones se listan con código de ticket, solo el nombre de pila del cliente y el comentario", async () => {
    state.matching = 1;
    state.rows = [
      {
        rating: 2,
        ratingComment: "Tardaron mucho",
        ratedAt: new Date("2026-10-05T15:00:00.000Z"),
        resolvedAt: new Date("2026-10-05T14:00:00.000Z"),
        guestName: null,
        ticket: { id: "t-1", number: 42, subject: "No llegó", category: { name: "Entrega" }, customer: { name: "Carla Gómez Pineda" } },
      },
      // sin ticket → se descarta
      { rating: 5, ratingComment: null, ratedAt: null, resolvedAt: new Date("2026-10-01T00:00:00.000Z"), guestName: null, ticket: null },
      // sin ratedAt → cae a la fecha de resolución; visitante → nombre de pila de su nombre
      {
        rating: 4,
        ratingComment: null,
        ratedAt: null,
        resolvedAt: new Date("2026-10-01T00:00:00.000Z"),
        guestName: "Visitante Sin Cuenta",
        ticket: { id: "t-2", number: 43, subject: "Otro", category: { name: "Pago" }, customer: null },
      },
    ];
    const result = await getSupportRatings(AGENT, query());
    expect(result.items).toEqual([
      { ticketId: "t-1", ticketCode: "T-42", subject: "No llegó", categoryName: "Entrega", customerName: "Carla", rating: 2, comment: "Tardaron mucho", ratedAt: "2026-10-05T15:00:00.000Z" },
      { ticketId: "t-2", ticketCode: "T-43", subject: "Otro", categoryName: "Pago", customerName: "Visitante", rating: 4, comment: null, ratedAt: "2026-10-01T00:00:00.000Z" },
    ]);
    expect(JSON.stringify(result)).not.toContain("Gómez");
    expect(result.matching).toBe(1);
  });

  it("limita la lista a las 30 más recientes", async () => {
    await getSupportRatings(AGENT, query());
    expect((state.calls.findMany[0] as { take: number }).take).toBe(30);
  });
});
