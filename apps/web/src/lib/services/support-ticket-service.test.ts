import { supportTicketListQuerySchema } from "@mimo/validation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffActor } from "@/lib/support/ticket-rules";
import { createFakeDb, newId, seedStaff, seedTicket, type FakeDb } from "./support-test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

vi.mock("@mimo/database", () => ({
  Prisma: {},
  prisma: new Proxy({}, { get: (_target, prop) => (holder.db.prisma as Record<string, unknown>)[prop as string] }),
}));
const logAdminAction = vi.fn();
vi.mock("./admin-audit-service", () => ({ logAdminAction }));
const createNotification = vi.fn<(input: { userId: string; title: string; [key: string]: unknown }) => Promise<void>>(async () => {});
vi.mock("./notification-service", () => ({ createNotification }));
const sendEmail = vi.fn<(input: Record<string, unknown>) => Promise<void>>(async () => {});
vi.mock("./email-service", () => ({
  sendEmail,
  buildSupportReplyEmail: (input: unknown) => ({ subject: "respuesta", html: JSON.stringify(input) }),
  buildSupportTicketResolvedEmail: (input: unknown) => ({ subject: "resuelto", html: JSON.stringify(input) }),
}));
const findOrderForLinking = vi.fn();
vi.mock("./support-context-service", () => ({
  getCustomerCard: vi.fn(async () => ({ isGuest: false, name: "Carla Cliente", email: "carla@correo.com", phone: null, memberSince: null, orderCount: 0, ticketCount: 1, recentOrders: [], previousTickets: [] })),
  getTicketOrderCard: vi.fn(async () => null),
  getBusinessCard: vi.fn(async () => null),
  getOrderAddress: vi.fn(),
  findOrderForLinking,
}));
const logRedaction = vi.fn();
vi.mock("./support-ticket-intake-service", () => ({ ensureTicketsForEscalatedConversations: vi.fn(), logRedaction }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const service = await import("./support-ticket-service");

const q = (view: string, extra: Record<string, unknown> = {}) => supportTicketListQuerySchema.parse({ view, ...extra });
const agent = (id: string): StaffActor => ({ id, role: "SUPPORT_AGENT" });
const manager = (id: string): StaffActor => ({ id, role: "SUPPORT_MANAGER" });

let seed: ReturnType<typeof seedStaff>;
let db: FakeDb;

beforeEach(() => {
  vi.clearAllMocks();
  holder.db = createFakeDb();
  db = holder.db;
  seed = seedStaff(db);
});

const ticketRow = (id: string) => db.tickets.rows.find((row) => row.id === id)!;
const rejectedWith = async (promise: Promise<unknown>) => promise.then(() => null, (error: { code?: string; status?: number }) => error);

describe("quién ve qué (anti-IDOR)", () => {
  it("un agente ve la cola sin asignar y SUS tickets, pero no los de otro agente", async () => {
    const free = await seedTicket(db, seed);
    const mine = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const theirs = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentB.id });

    const list = await service.listTickets(agent(seed.agentA.id), q("todos"));
    const ids = list.items.map((item) => item.id);
    expect(ids).toContain(free.ticket.id);
    expect(ids).toContain(mine.ticket.id);
    expect(ids).not.toContain(theirs.ticket.id);
  });

  it("supervisor y administrador ven todos los tickets", async () => {
    await seedTicket(db, seed);
    await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentB.id });
    await seedTicket(db, seed, { status: "CLOSED", assignedAgentId: seed.agentB.id });

    expect((await service.listTickets(manager(seed.manager.id), q("todos"))).items).toHaveLength(3);
    expect((await service.listTickets({ id: seed.admin.id, role: "ADMIN" }, q("todos"))).items).toHaveLength(3);
  });

  it("los contadores de cada cola respetan el alcance del usuario", async () => {
    await seedTicket(db, seed); // sin asignar
    await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentB.id });

    const asAgent = await service.listTickets(agent(seed.agentA.id), q("sin_asignar"));
    expect(asAgent.counts).toMatchObject({ sin_asignar: 1, mios: 1, en_atencion: 1, todos: 2 });
    const asManager = await service.listTickets(manager(seed.manager.id), q("sin_asignar"));
    expect(asManager.counts).toMatchObject({ sin_asignar: 1, en_atencion: 2, todos: 3 });
  });

  it("abrir el ticket de otro agente por su id responde 404 (IDOR), no 403: no confirma que existe", async () => {
    const theirs = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentB.id });
    const error = await rejectedWith(service.getTicketDetail(agent(seed.agentA.id), theirs.ticket.id));
    expect(error).toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("todas las operaciones sobre el ticket de otro agente dan 404 (detalle, mensajes, acciones, notas)", async () => {
    const theirs = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentB.id });
    const me = agent(seed.agentA.id);
    const calls = [
      service.getTicketDetail(me, theirs.ticket.id),
      service.listTicketMessages(me, theirs.ticket.id),
      service.performTicketAction(me, theirs.ticket.id, { action: "priority", priority: "URGENT" }),
      service.performTicketAction(me, theirs.ticket.id, { action: "take" }),
      service.postTicketMessage(me, theirs.ticket.id, { kind: "note", body: "intento" }),
      service.postTicketMessage(me, theirs.ticket.id, { kind: "reply", body: "intento" }),
      service.revealOrderAddress(me, theirs.ticket.id),
    ];
    for (const call of calls) expect(await rejectedWith(call)).toMatchObject({ code: "NOT_FOUND" });
    // y nada se modificó
    expect(ticketRow(theirs.ticket.id)).toMatchObject({ assignedAgentId: seed.agentB.id, priority: "NORMAL" });
    expect(db.messages.rows.filter((m) => m.visibility === "INTERNAL")).toHaveLength(0);
  });

  it("un ticket escalado sin dueño solo lo ve supervisión (el agente no)", async () => {
    const escalated = await seedTicket(db, seed, { status: "ESCALATED" });
    expect(await rejectedWith(service.getTicketDetail(agent(seed.agentA.id), escalated.ticket.id))).toMatchObject({ code: "NOT_FOUND" });
    await expect(service.getTicketDetail(manager(seed.manager.id), escalated.ticket.id)).resolves.toBeDefined();
  });

  it("el detalle incluye los permisos del actor (para esconder botones; el servidor igual valida)", async () => {
    const mine = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const detail = await service.getTicketDetail(agent(seed.agentA.id), mine.ticket.id);
    expect(detail.permissions).toMatchObject({ canReply: true, canAssign: false, isManager: false });
    expect(detail.ticket.code).toMatch(/^T-\d+$/);
  });
});

describe("tomar un ticket (concurrencia)", () => {
  it("si 3 agentes tocan «Tomar» a la vez, SOLO UNO se queda con el ticket", async () => {
    const { ticket } = await seedTicket(db, seed);
    const agentC = db.users.rows[db.users.rows.push({ id: newId(), name: "Carlos", email: "c@mimo.sv", role: "SUPPORT_AGENT", deletedAt: null }) - 1]!;

    const results = await Promise.allSettled([
      service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "take" }),
      service.performTicketAction(agent(seed.agentB.id), ticket.id, { action: "take" }),
      service.performTicketAction(agent(agentC.id as string), ticket.id, { action: "take" }),
    ]);

    const winners = results.filter((result) => result.status === "fulfilled");
    const losers = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(2);
    for (const loser of losers) expect(loser.reason).toMatchObject({ code: "TICKET_ALREADY_TAKEN", status: 409 });

    const row = ticketRow(ticket.id);
    expect(row.status).toBe("IN_PROGRESS");
    expect([seed.agentA.id, seed.agentB.id, agentC.id]).toContain(row.assignedAgentId);
    // La auditoría registra una sola asignación.
    expect(logAdminAction.mock.calls.filter((call) => call[0].action === "ticket.assigned")).toHaveLength(1);
  });

  it("el mismo agente tocando dos veces: la segunda falla y el ticket sigue siendo suyo", async () => {
    const { ticket } = await seedTicket(db, seed);
    const results = await Promise.allSettled([
      service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "take" }),
      service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "take" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(ticketRow(ticket.id).assignedAgentId).toBe(seed.agentA.id);
  });

  it("un ticket ya tomado no se puede tomar (el segundo agente no lo ve; supervisión recibe un conflicto claro)", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    expect(await rejectedWith(service.performTicketAction(agent(seed.agentB.id), ticket.id, { action: "take" }))).toMatchObject({ code: "NOT_FOUND" });
    expect(await rejectedWith(service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "take" }))).toMatchObject({
      code: "TICKET_UNAVAILABLE",
    });
    expect(ticketRow(ticket.id).assignedAgentId).toBe(seed.agentA.id);
  });

  it("al tomar, el ticket pasa a EN ATENCIÓN y la conversación del cliente a «con una persona»", async () => {
    const { ticket, conversation } = await seedTicket(db, seed);
    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "take" });
    expect(ticketRow(ticket.id)).toMatchObject({ status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    expect(db.conversations.rows.find((c) => c.id === conversation.id)).toMatchObject({ status: "WITH_AGENT", assignedToId: seed.agentA.id });
  });

  it("liberar devuelve el ticket a la cola y lo puede tomar otro agente", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "release" });
    expect(ticketRow(ticket.id)).toMatchObject({ status: "OPEN", assignedAgentId: null });
    await service.performTicketAction(agent(seed.agentB.id), ticket.id, { action: "take" });
    expect(ticketRow(ticket.id).assignedAgentId).toBe(seed.agentB.id);
  });
});

describe("asignar y reasignar", () => {
  it("un agente NO puede asignar ni reasignar (solo supervisión)", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    expect(await rejectedWith(service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "assign", agentId: seed.agentB.id }))).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    expect(ticketRow(ticket.id).assignedAgentId).toBe(seed.agentA.id);
  });

  it("supervisión asigna, reasigna y avisa a la persona asignada", async () => {
    const { ticket } = await seedTicket(db, seed);
    await service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "assign", agentId: seed.agentA.id });
    expect(ticketRow(ticket.id)).toMatchObject({ assignedAgentId: seed.agentA.id, status: "IN_PROGRESS" });

    await service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "assign", agentId: seed.agentB.id });
    expect(ticketRow(ticket.id).assignedAgentId).toBe(seed.agentB.id);

    expect(logAdminAction.mock.calls.map((call) => call[0].action)).toEqual(["ticket.assigned", "ticket.reassigned"]);
    expect(createNotification.mock.calls.map((call) => call[0].userId)).toEqual([seed.agentA.id, seed.agentB.id]);
  });

  it("solo se puede asignar a personal de soporte real y activo (nunca a un cliente ni a un id inventado)", async () => {
    const { ticket } = await seedTicket(db, seed);
    for (const target of [seed.customer.id, newId()]) {
      expect(await rejectedWith(service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "assign", agentId: target }))).toMatchObject({
        code: "INVALID_AGENT",
      });
    }
    // una persona de soporte suspendida tampoco
    const suspended = db.users.rows[db.users.rows.push({ id: newId(), name: "Susp", email: "s@mimo.sv", role: "SUPPORT_AGENT", deletedAt: new Date() }) - 1]!;
    expect(await rejectedWith(service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "assign", agentId: suspended.id as string }))).toMatchObject({
      code: "INVALID_AGENT",
    });
    expect(ticketRow(ticket.id).assignedAgentId).toBeNull();
  });
});

describe("estados", () => {
  it("recorrido completo: tomar → esperar cliente → atender → resolver → cerrar → reabrir", async () => {
    const { ticket, conversation } = await seedTicket(db, seed);
    const me = agent(seed.agentA.id);
    const step = (status: string) => service.performTicketAction(me, ticket.id, { action: "status", status } as never);

    await service.performTicketAction(me, ticket.id, { action: "take" });
    await step("WAITING_CUSTOMER");
    expect(ticketRow(ticket.id).status).toBe("WAITING_CUSTOMER");
    await step("IN_PROGRESS");
    await step("RESOLVED");
    expect(ticketRow(ticket.id)).toMatchObject({ status: "RESOLVED" });
    expect(ticketRow(ticket.id).resolvedAt).toBeInstanceOf(Date);
    expect(db.conversations.rows.find((c) => c.id === conversation.id)).toMatchObject({ status: "RESOLVED" });

    // resolver deja un mensaje PÚBLICO que invita a calificar
    const botMessage = db.messages.rows.find((m) => m.role === "BOT");
    expect(botMessage).toMatchObject({ visibility: "PUBLIC" });
    expect(String(botMessage?.body)).toContain("resuelta");

    await step("CLOSED");
    expect(ticketRow(ticket.id).closedAt).toBeInstanceOf(Date);

    // un agente NO puede reabrir un ticket CERRADO; un supervisor sí
    expect(await rejectedWith(service.performTicketAction(me, ticket.id, { action: "status", status: "OPEN" }))).toMatchObject({ status: 403 });
    await service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "status", status: "OPEN" });
    expect(ticketRow(ticket.id)).toMatchObject({ status: "OPEN", closedAt: null, resolvedAt: null, reopenCount: 1 });
  });

  it("transiciones inválidas se rechazan en el servidor (NEW→RESOLVED, CLOSED→IN_PROGRESS…)", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const me = agent(seed.agentA.id);
    await service.performTicketAction(me, ticket.id, { action: "status", status: "CLOSED" });
    const error = await rejectedWith(service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "status", status: "IN_PROGRESS" }));
    expect(error).toMatchObject({ code: "INVALID_TRANSITION", status: 409 });
    expect(ticketRow(ticket.id).status).toBe("CLOSED");
  });

  it("un agente reabre su propio ticket RESUELTO (vuelve a EN ATENCIÓN con el mismo dueño)", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "RESOLVED", assignedAgentId: seed.agentA.id });
    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "status", status: "IN_PROGRESS" });
    expect(ticketRow(ticket.id)).toMatchObject({ status: "IN_PROGRESS", assignedAgentId: seed.agentA.id, reopenCount: 1 });
  });

  it("resolver o esperar sin dueño exige asignar primero", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "ESCALATED" });
    const error = await rejectedWith(service.performTicketAction(manager(seed.manager.id), ticket.id, { action: "status", status: "RESOLVED" }));
    expect(error).toMatchObject({ code: "NEEDS_ASSIGNEE" });
  });

  it("dos cambios simultáneos sobre el mismo ticket: el segundo falla en vez de pisar al primero", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const me = agent(seed.agentA.id);
    const results = await Promise.allSettled([
      service.performTicketAction(me, ticket.id, { action: "status", status: "WAITING_CUSTOMER" }),
      service.performTicketAction(me, ticket.id, { action: "status", status: "RESOLVED" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(failed?.reason).toMatchObject({ code: "TICKET_CHANGED", status: 409 });
  });

  it("escalar: pasa a ESCALATED, deja el motivo como NOTA INTERNA y avisa a supervisión", async () => {
    const { ticket, conversation } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "escalate", reason: "El cliente amenaza con denunciar" });

    expect(ticketRow(ticket.id).status).toBe("ESCALATED");
    const note = db.messages.rows.find((m) => m.conversationId === conversation.id && m.visibility === "INTERNAL");
    expect(String(note?.body)).toContain("El cliente amenaza con denunciar");
    expect(createNotification.mock.calls.map((call) => call[0].userId)).toEqual([seed.manager.id]);
    expect(logAdminAction.mock.calls.map((call) => call[0].action)).toContain("ticket.escalated");
  });
});

describe("prioridad, categoría y vínculos", () => {
  it("el agente cambia la prioridad de su ticket y queda auditado; avisa a supervisión si pasa a URGENTE", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "priority", priority: "URGENT" });
    expect(ticketRow(ticket.id).priority).toBe("URGENT");
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ticket.priority_changed", metadata: { from: "NORMAL", to: "URGENT" } }));
    expect(createNotification.mock.calls.map((call) => call[0].userId)).toEqual([seed.manager.id]);
  });

  it("una categoría desactivada o inexistente no se puede asignar", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const inactive = db.categories.rows[db.categories.rows.push({ id: newId(), slug: "vieja", name: "Vieja", isActive: false }) - 1]!;
    for (const categoryId of [inactive.id as string, newId()]) {
      expect(await rejectedWith(service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "category", categoryId }))).toMatchObject({ code: "INVALID_CATEGORY" });
    }
  });

  it("vincular un pedido: lo guarda, vincula también el negocio si es uno solo y avisa si no es del cliente", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const orderId = newId();
    const businessId = newId();
    findOrderForLinking.mockResolvedValue({ id: orderId, buyerId: seed.otherCustomer.id, businessIds: [businessId] });

    await service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "link_order", orderNumber: "MIMO-20260912-AB12C" });

    expect(ticketRow(ticket.id)).toMatchObject({ orderId, businessId });
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ticket.order_linked", metadata: { orderNumber: "MIMO-20260912-AB12C", ownedByCustomer: false } }));
  });

  it("un pedido inexistente no se vincula", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    findOrderForLinking.mockResolvedValue(null);
    expect(await rejectedWith(service.performTicketAction(agent(seed.agentA.id), ticket.id, { action: "link_order", orderNumber: "MIMO-20260101-ZZZZZ" }))).toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
    expect(ticketRow(ticket.id).orderId).toBeNull();
  });
});

describe("conversación: respuestas y notas internas", () => {
  it("responder: mensaje PÚBLICO con la autoría del agente, primera respuesta registrada UNA sola vez y aviso al cliente", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const me = agent(seed.agentA.id);

    await service.postTicketMessage(me, ticket.id, { kind: "reply", body: "Hola Carla, ya estamos revisando." });
    const first = ticketRow(ticket.id).firstResponseAt;
    expect(first).toBeInstanceOf(Date);
    await service.postTicketMessage(me, ticket.id, { kind: "reply", body: "Te cuento más…" });
    expect(ticketRow(ticket.id).firstResponseAt).toEqual(first);

    const replies = db.messages.rows.filter((m) => m.role === "AGENT");
    expect(replies.every((m) => m.visibility === "PUBLIC" && m.senderId === seed.agentA.id)).toBe(true);
    // aviso en la app al cliente; correo solo en la primera respuesta de la ronda
    expect(createNotification.mock.calls.filter((call) => call[0].userId === seed.customer.id)).toHaveLength(2);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("una NOTA INTERNA es INTERNAL, no avisa al cliente, no manda correo ni cambia el estado del ticket", async () => {
    const { ticket, conversation } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const lastMessageAt = db.conversations.rows.find((c) => c.id === conversation.id)!.lastMessageAt;

    await service.postTicketMessage(agent(seed.agentA.id), ticket.id, { kind: "note", body: "Ojo: el negocio ya tuvo 3 reclamos." });

    const note = db.messages.rows.find((m) => m.visibility === "INTERNAL");
    expect(note).toMatchObject({ role: "AGENT", conversationId: conversation.id, senderId: seed.agentA.id });
    expect(createNotification).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(ticketRow(ticket.id)).toMatchObject({ status: "IN_PROGRESS", firstResponseAt: null, lastAgentMessageAt: null });
    expect(db.conversations.rows.find((c) => c.id === conversation.id)!.lastMessageAt).toEqual(lastMessageAt);
  });

  it("la visibilidad la decide el servidor por el tipo de acción: un campo extra del cliente no la cambia", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    // `visibility: "PUBLIC"` no existe en el esquema: el servicio nunca lo lee.
    await service.postTicketMessage(agent(seed.agentA.id), ticket.id, { kind: "note", body: "solo equipo", visibility: "PUBLIC" } as never);
    expect(db.messages.rows.find((m) => m.body === "solo equipo")).toMatchObject({ visibility: "INTERNAL" });
  });

  it("no se puede responder sin ser dueño (sin tomar el ticket, o ya resuelto)", async () => {
    const free = await seedTicket(db, seed);
    expect(await rejectedWith(service.postTicketMessage(agent(seed.agentA.id), free.ticket.id, { kind: "reply", body: "hola" }))).toMatchObject({ status: 403 });
    const resolved = await seedTicket(db, seed, { status: "RESOLVED", assignedAgentId: seed.agentA.id });
    expect(await rejectedWith(service.postTicketMessage(agent(seed.agentA.id), resolved.ticket.id, { kind: "reply", body: "hola" }))).toMatchObject({ status: 403 });
    expect(db.messages.rows.filter((m) => m.role === "AGENT")).toHaveLength(0);
  });

  it("«dejar esperando al cliente» pasa el ticket a ESPERANDO CLIENTE al enviar", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    await service.postTicketMessage(agent(seed.agentA.id), ticket.id, { kind: "reply", body: "¿Me pasás una foto?", waitForCustomer: true });
    expect(ticketRow(ticket.id).status).toBe("WAITING_CUSTOMER");
  });

  it("un DUI o una tarjeta que pegue el equipo se enmascara también (y solo queda registrado QUE pasó)", async () => {
    const { ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const result = await service.postTicketMessage(agent(seed.agentA.id), ticket.id, { kind: "note", body: "su dui es 04295342-7" });
    expect(result.redacted).toBe(true);
    const stored = db.messages.rows.find((m) => m.visibility === "INTERNAL");
    expect(stored?.body).toBe("su dui es [DUI oculto]");
    expect(stored?.redacted).toBe(true);
    expect(JSON.stringify([db.messages.rows, logAdminAction.mock.calls, logRedaction.mock.calls])).not.toContain("04295342");
  });

  it("los mensajes del equipo incluyen las notas; paginan por bloques y el polling pide solo lo nuevo", async () => {
    const { ticket, conversation } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    // Los mensajes de la prueba son MÁS NUEVOS que el mensaje inicial del cliente (hace 60 s).
    const base = Date.now() - 50_000;
    for (let i = 0; i < 34; i++) {
      await db.messages.create({
        data: { conversationId: conversation.id, role: "USER", body: `m${i}`, createdAt: new Date(base + i * 1000), visibility: i === 5 ? "INTERNAL" : "PUBLIC" },
      });
    }
    const me = agent(seed.agentA.id);

    const page1 = await service.listTicketMessages(me, ticket.id);
    expect(page1.items).toHaveLength(30);
    expect(page1.hasMore).toBe(true);
    expect(page1.items.at(-1)?.body).toBe("m33"); // el bloque más reciente, en orden cronológico
    expect(page1.items[0]?.body).toBe("m4");
    expect(page1.items.some((m) => m.visibility === "INTERNAL")).toBe(true); // el equipo sí ve las notas
    expect(page1.nextCursor).toBe(page1.items[0]!.createdAt);

    const page2 = await service.listTicketMessages(me, ticket.id, { before: page1.nextCursor! });
    expect(page2.hasMore).toBe(false);
    expect(page2.items.map((m) => m.body)).toEqual(["Mi pedido no llegó", "m0", "m1", "m2", "m3"].sort((a, b) => (a === "Mi pedido no llegó" ? -1 : b === "Mi pedido no llegó" ? 1 : 0)));

    const newer = await service.listTicketMessages(me, ticket.id, { after: new Date(base + 32_000).toISOString() });
    expect(newer.items.map((m) => m.body)).toEqual(["m33"]);
  });
});
