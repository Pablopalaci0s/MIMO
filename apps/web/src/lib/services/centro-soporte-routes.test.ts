import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { createFakeDb, newId, type FakeDb } from "./support-test-db";

/**
 * Autorización de TODAS las rutas de /api/centro-soporte con el `api-response`
 * y el límite de tasa REALES, la sesión simulada y el rol leído de la base
 * (falsa). Los servicios de negocio son espías: lo que se prueba es que una
 * petición no autorizada ni siquiera llega a ellos.
 */

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

class ForbiddenError extends Error {}
class UnauthorizedError extends Error {}
const auth = vi.fn();

vi.mock("@mimo/auth", () => ({ auth, ForbiddenError, UnauthorizedError }));
vi.mock("@mimo/database", () => ({
  Prisma: {},
  prisma: new Proxy({}, { get: (_target, prop) => (holder.db.prisma as Record<string, unknown>)[prop as string] }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const ticketService = vi.hoisted(() => ({
  listTickets: vi.fn(async () => ({ items: [], counts: {} })),
  getTicketDetail: vi.fn(async () => ({})),
  performTicketAction: vi.fn(async () => {}),
  listTicketMessages: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null })),
  postTicketMessage: vi.fn(async () => ({ redacted: false })),
  revealOrderAddress: vi.fn(async () => ({})),
  listSupportStaff: vi.fn(async () => []),
}));
vi.mock("@/lib/services/support-ticket-service", () => ticketService);
const configService = vi.hoisted(() => ({
  listMacros: vi.fn(async () => []),
  createMacro: vi.fn(async () => ({})),
  updateMacro: vi.fn(async () => ({})),
  deleteMacro: vi.fn(async () => {}),
  listCategories: vi.fn(async () => []),
  createCategory: vi.fn(async () => ({})),
  updateCategory: vi.fn(async () => ({})),
}));
vi.mock("@/lib/services/support-config-service", () => configService);
const getSupportMetrics = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/lib/services/support-metrics-service", () => ({ getSupportMetrics }));
const searchBusinessesForLinking = vi.hoisted(() => vi.fn(async () => []));
vi.mock("@/lib/services/support-context-service", () => ({ searchBusinessesForLinking }));

const profileService = vi.hoisted(() => ({
  getSupportProfile: vi.fn(async () => ({})),
  setSupportUsername: vi.fn(async () => ({})),
}));
vi.mock("@/lib/services/support-profile-service", () => profileService);
const getSupportRatings = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/lib/services/support-ratings-service", () => ({ getSupportRatings }));

const routes = {
  profile: await import("@/app/api/centro-soporte/perfil/route"),
  ratings: await import("@/app/api/centro-soporte/calificaciones/route"),
  tickets: await import("@/app/api/centro-soporte/tickets/route"),
  ticket: await import("@/app/api/centro-soporte/tickets/[id]/route"),
  messages: await import("@/app/api/centro-soporte/tickets/[id]/mensajes/route"),
  address: await import("@/app/api/centro-soporte/tickets/[id]/direccion/route"),
  macros: await import("@/app/api/centro-soporte/macros/route"),
  macro: await import("@/app/api/centro-soporte/macros/[id]/route"),
  categories: await import("@/app/api/centro-soporte/categorias/route"),
  category: await import("@/app/api/centro-soporte/categorias/[id]/route"),
  staff: await import("@/app/api/centro-soporte/agentes/route"),
  metrics: await import("@/app/api/centro-soporte/metricas/route"),
  businesses: await import("@/app/api/centro-soporte/negocios/route"),
};

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const idParams = { params: Promise.resolve({ id: ID }) };
const req = (path: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost/api/centro-soporte/${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });

type Call = { name: string; manager: boolean; run: () => Promise<Response> };
const CALLS: Call[] = [
  { name: "GET tickets", manager: false, run: () => routes.tickets.GET(req("tickets?view=todos")) },
  { name: "GET ticket", manager: false, run: () => routes.ticket.GET(req(`tickets/${ID}`), idParams) },
  { name: "PATCH ticket", manager: false, run: () => routes.ticket.PATCH(req(`tickets/${ID}`, "PATCH", { action: "take" }), idParams) },
  { name: "GET mensajes", manager: false, run: () => routes.messages.GET(req(`tickets/${ID}/mensajes`), idParams) },
  { name: "POST mensajes", manager: false, run: () => routes.messages.POST(req(`tickets/${ID}/mensajes`, "POST", { kind: "note", body: "hola" }), idParams) },
  { name: "POST direccion", manager: false, run: () => routes.address.POST(req(`tickets/${ID}/direccion`, "POST"), idParams) },
  { name: "GET negocios", manager: false, run: () => routes.businesses.GET(req("negocios?q=ro")) },
  { name: "GET macros", manager: false, run: () => routes.macros.GET() },
  { name: "GET categorias", manager: false, run: () => routes.categories.GET() },
  { name: "GET perfil", manager: false, run: () => routes.profile.GET() },
  { name: "POST perfil", manager: false, run: () => routes.profile.POST(req("perfil", "POST", { username: "ana.m" })) },
  { name: "GET calificaciones", manager: false, run: () => routes.ratings.GET(req("calificaciones?days=30")) },
  { name: "POST macros", manager: true, run: () => routes.macros.POST(req("macros", "POST", { title: "Hola", body: "Texto de la respuesta" })) },
  { name: "PATCH macro", manager: true, run: () => routes.macro.PATCH(req(`macros/${ID}`, "PATCH", { isActive: false }), idParams) },
  { name: "DELETE macro", manager: true, run: () => routes.macro.DELETE(req(`macros/${ID}`, "DELETE"), idParams) },
  { name: "POST categorias", manager: true, run: () => routes.categories.POST(req("categorias", "POST", { name: "Facturación", defaultPriority: "NORMAL" })) },
  { name: "PATCH categoria", manager: true, run: () => routes.category.PATCH(req(`categorias/${ID}`, "PATCH", { isActive: false }), idParams) },
  { name: "GET agentes", manager: true, run: () => routes.staff.GET() },
  { name: "GET metricas", manager: true, run: () => routes.metrics.GET(req("metricas?days=30")) },
];

function signIn(role: string | null) {
  if (role === null) {
    auth.mockResolvedValue(null);
    return null;
  }
  const user = holder.db.users.rows[holder.db.users.rows.push({ id: newId(), name: role, email: `${role}@mimo.sv`, role, deletedAt: null }) - 1]!;
  // El JWT dice lo mismo que la base en estos casos; los desacuerdos se prueban en support-access-service.test.ts.
  auth.mockResolvedValue({ user: { id: user.id, role } });
  return user.id as string;
}

const allSpies = () => [...Object.values(ticketService), ...Object.values(configService), ...Object.values(profileService), getSupportRatings, getSupportMetrics, searchBusinessesForLinking];

beforeEach(() => {
  holder.db = createFakeDb();
  vi.clearAllMocks();
});

describe("matriz de acceso: rol × ruta", () => {
  it.each(CALLS)("$name: sin sesión → 401 y el servicio no se ejecuta", async ({ run }) => {
    signIn(null);
    expect((await run()).status).toBe(401);
    for (const spy of allSpies()) expect(spy).not.toHaveBeenCalled();
  });

  it.each(CALLS)("$name: un cliente (USER) → 403, nunca llega al servicio", async ({ run }) => {
    signIn("USER");
    expect((await run()).status).toBe(403);
    for (const spy of allSpies()) expect(spy).not.toHaveBeenCalled();
  });

  it.each(CALLS)("$name: el dueño de un NEGOCIO → 403 (un negocio no puede ver los tickets internos)", async ({ run }) => {
    signIn("BUSINESS");
    expect((await run()).status).toBe(403);
    for (const spy of allSpies()) expect(spy).not.toHaveBeenCalled();
  });

  it.each(CALLS)("$name: agente de soporte → permitido solo si NO es de supervisión", async ({ run, manager }) => {
    signIn("SUPPORT_AGENT");
    const status = (await run()).status;
    if (manager) {
      expect(status).toBe(403);
      for (const spy of allSpies()) expect(spy).not.toHaveBeenCalled();
    } else {
      expect(status).toBeLessThan(300);
    }
  });

  it.each(CALLS)("$name: supervisor y administrador → permitido", async ({ run }) => {
    for (const role of ["SUPPORT_MANAGER", "ADMIN"]) {
      signIn(role);
      expect((await run()).status, role).toBeLessThan(300);
    }
  });
});

describe("el actor sale de la sesión, nunca del cuerpo", () => {
  it("una acción con campos extra (actorId, role, customerId, agentId ajeno) llega al servicio SIN ellos y con el actor real", async () => {
    const actorId = signIn("SUPPORT_AGENT")!;
    const response = await routes.ticket.PATCH(
      req(`tickets/${ID}`, "PATCH", { action: "priority", priority: "HIGH", actorId: "otro", role: "ADMIN", customerId: "x", canReviewDocuments: true }),
      idParams,
    );
    expect(response.status).toBe(200);
    expect(ticketService.performTicketAction).toHaveBeenCalledWith({ id: actorId, role: "SUPPORT_AGENT" }, ID, { action: "priority", priority: "HIGH" });
  });

  it("al enviar un mensaje, la visibilidad, el autor y el rol del cuerpo se ignoran", async () => {
    const actorId = signIn("SUPPORT_AGENT")!;
    await routes.messages.POST(req(`tickets/${ID}/mensajes`, "POST", { kind: "note", body: "nota", visibility: "PUBLIC", senderId: "otro", role: "USER" }), idParams);
    expect(ticketService.postTicketMessage).toHaveBeenCalledWith({ id: actorId, role: "SUPPORT_AGENT" }, ID, { kind: "note", body: "nota" });
  });

  it("un agente que se declara «admin» en el cuerpo sigue sin poder usar las rutas de supervisión", async () => {
    signIn("SUPPORT_AGENT");
    const response = await routes.macros.POST(req("macros", "POST", { title: "Hola", body: "Texto", role: "ADMIN", isManager: true }));
    expect(response.status).toBe(403);
    expect(configService.createMacro).not.toHaveBeenCalled();
  });
});

describe("validación de entradas", () => {
  beforeEach(() => {
    signIn("SUPPORT_MANAGER");
  });

  it("un id que no es un UUID se rechaza (400) antes de tocar nada", async () => {
    const bad = { params: Promise.resolve({ id: "1; DROP TABLE support_tickets" }) };
    expect((await routes.ticket.GET(req("tickets/x"), bad)).status).toBe(400);
    expect((await routes.ticket.PATCH(req("tickets/x", "PATCH", { action: "take" }), bad)).status).toBe(400);
    expect((await routes.messages.POST(req("tickets/x/mensajes", "POST", { kind: "reply", body: "hola" }), bad)).status).toBe(400);
    expect(ticketService.getTicketDetail).not.toHaveBeenCalled();
    expect(ticketService.performTicketAction).not.toHaveBeenCalled();
    expect(ticketService.postTicketMessage).not.toHaveBeenCalled();
  });

  it("acciones desconocidas, estados inventados o campos faltantes → 400", async () => {
    for (const body of [
      { action: "borrar_todo" },
      { action: "status", status: "NEW" }, // un ticket no vuelve a NEW
      { action: "status", status: "INVENTADO" },
      { action: "priority", priority: "MAXIMA" },
      { action: "assign" }, // falta agentId
      { action: "assign", agentId: "no-uuid" },
      { action: "link_order", orderNumber: "12345" },
      { action: "escalate", reason: "x" }, // motivo muy corto
      {},
    ]) {
      expect((await routes.ticket.PATCH(req(`tickets/${ID}`, "PATCH", body), idParams)).status, JSON.stringify(body)).toBe(400);
    }
    expect(ticketService.performTicketAction).not.toHaveBeenCalled();
  });

  it("mensajes: vacíos, demasiado largos o de un tipo inválido → 400", async () => {
    for (const body of [{ kind: "reply", body: "   " }, { kind: "reply", body: "a".repeat(4001) }, { kind: "grito", body: "hola" }, { body: "hola" }]) {
      expect((await routes.messages.POST(req(`tickets/${ID}/mensajes`, "POST", body), idParams)).status).toBe(400);
    }
    expect(ticketService.postTicketMessage).not.toHaveBeenCalled();
  });

  it("filtros de la bandeja inválidos (estado inventado, fecha mala, página 0) → 400", async () => {
    for (const query of ["view=todos&status=INVENTADO", "view=todos&from=ayer", "view=todos&page=0", "view=otra"]) {
      expect((await routes.tickets.GET(req(`tickets?${query}`))).status, query).toBe(400);
    }
    expect(ticketService.listTickets).not.toHaveBeenCalled();
  });

  it("los campos vacíos del formulario de filtros cuentan como «sin filtro»", async () => {
    expect((await routes.tickets.GET(req("tickets?view=todos&status=&q=&agent="))).status).toBe(200);
    expect(ticketService.listTickets).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ view: "todos", page: 1 }));
  });

  it("métricas: solo 7, 30 o 90 días", async () => {
    expect((await routes.metrics.GET(req("metricas?days=365"))).status).toBe(400);
    expect((await routes.metrics.GET(req("metricas?days=7"))).status).toBe(200);
  });

  it("un ticket que el servicio no deja ver responde 404 (no 403)", async () => {
    signIn("SUPPORT_AGENT");
    ticketService.getTicketDetail.mockRejectedValueOnce(new AppError("NOT_FOUND", "No encontramos ese ticket.", 404));
    const response = await routes.ticket.GET(req(`tickets/${ID}`), idParams);
    expect(response.status).toBe(404);
  });
});

describe("nombre de usuario y calificaciones", () => {
  it("el nombre de usuario se guarda para quien está en la sesión: el cuerpo no puede nombrar a otra persona", async () => {
    const actorId = signIn("SUPPORT_AGENT")!;
    await routes.profile.POST(req("perfil", "POST", { username: "Ana.M", userId: "otro", id: "otro", role: "ADMIN" }));
    expect(profileService.setSupportUsername).toHaveBeenCalledWith({ id: actorId, role: "SUPPORT_AGENT" }, "ana.m");
  });

  it("un nombre de usuario inválido o reservado se rechaza (400) antes de llegar al servicio", async () => {
    signIn("SUPPORT_AGENT");
    for (const username of ["ab", "con espacios", "admin", "", 5, null]) {
      expect((await routes.profile.POST(req("perfil", "POST", { username }))).status, String(username)).toBe(400);
    }
    expect((await routes.profile.POST(req("perfil", "POST", {}))).status).toBe(400);
    expect(profileService.setSupportUsername).not.toHaveBeenCalled();
  });

  it("calificaciones: filtros inválidos → 400; los vacíos del formulario cuentan como «sin filtro»", async () => {
    signIn("SUPPORT_MANAGER");
    for (const query of ["days=365", "agent=no-es-uuid", "kind=todas"]) {
      expect((await routes.ratings.GET(req(`calificaciones?${query}`))).status, query).toBe(400);
    }
    expect(getSupportRatings).not.toHaveBeenCalled();
    expect((await routes.ratings.GET(req("calificaciones?days=7&agent=&kind="))).status).toBe(200);
    expect(getSupportRatings).toHaveBeenCalledWith({ id: expect.any(String), role: "SUPPORT_MANAGER" }, { days: 7, agent: undefined, kind: "all" });
  });

  it("calificaciones: el actor sale de la sesión (el servicio decide el alcance con él)", async () => {
    const actorId = signIn("SUPPORT_AGENT")!;
    await routes.ratings.GET(req("calificaciones?days=30"));
    expect(getSupportRatings).toHaveBeenCalledWith({ id: actorId, role: "SUPPORT_AGENT" }, expect.objectContaining({ days: 30 }));
  });
});

describe("límite de tasa", () => {
  it("enviar mensajes tiene tope por persona: pasado el límite responde 429 con Retry-After, y a otra persona no la afecta", async () => {
    const first = signIn("SUPPORT_AGENT")!;
    let last: Response | null = null;
    let allowed = 0;
    for (let i = 0; i < 95; i++) {
      last = await routes.messages.POST(req(`tickets/${ID}/mensajes`, "POST", { kind: "note", body: `nota ${i}` }), idParams);
      if (last.status < 300) allowed++;
    }
    expect(allowed).toBe(90);
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(ticketService.postTicketMessage).toHaveBeenCalledTimes(90);
    expect(first).toBeTruthy();

    signIn("SUPPORT_AGENT"); // otra persona, otro balde
    expect((await routes.messages.POST(req(`tickets/${ID}/mensajes`, "POST", { kind: "note", body: "hola" }), idParams)).status).toBe(201);
  });

  it("revelar la dirección de entrega tiene un tope más estricto (queda auditado cada vez)", async () => {
    signIn("SUPPORT_AGENT");
    let status = 0;
    for (let i = 0; i < 61; i++) status = (await routes.address.POST(req(`tickets/${ID}/direccion`, "POST"), idParams)).status;
    expect(status).toBe(429);
    expect(ticketService.revealOrderAddress).toHaveBeenCalledTimes(60);
  });
});
