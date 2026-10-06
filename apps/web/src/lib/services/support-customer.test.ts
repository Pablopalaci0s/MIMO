import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, newId, seedStaff, seedTicket, type FakeDb } from "./support-test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

vi.mock("@mimo/database", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error { code = "P2002"; } },
  prisma: new Proxy({}, { get: (_target, prop) => (holder.db.prisma as Record<string, unknown>)[prop as string] }),
}));
const logAdminAction = vi.fn(async () => {});
vi.mock("./admin-audit-service", () => ({ logAdminAction }));
const createNotification = vi.fn<(input: { userId: string; title: string; [key: string]: unknown }) => Promise<void>>(async () => {});
vi.mock("./notification-service", () => ({ createNotification }));
const sendEmail = vi.fn<(input: Record<string, unknown>) => Promise<void>>(async () => {});
vi.mock("./email-service", () => ({
  sendEmail,
  buildSupportEscalationEmail: (input: unknown) => ({ subject: "escalada", html: JSON.stringify(input) }),
  buildSupportTicketCreatedEmail: (input: unknown) => ({ subject: "creado", html: JSON.stringify(input) }),
}));
const generateBotReply = vi.fn();
vi.mock("./support-bot-service", () => ({ generateBotReply }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const support = await import("./support-service");

let db: FakeDb;
let seed: ReturnType<typeof seedStaff>;

beforeEach(() => {
  vi.clearAllMocks();
  holder.db = createFakeDb();
  db = holder.db;
  seed = seedStaff(db);
  // Categorías que usa el clasificador.
  for (const [slug, name, defaultPriority] of [
    ["pago", "Pago", "HIGH"],
    ["entrega", "Entrega", "HIGH"],
    ["seguridad", "Seguridad", "URGENT"],
    ["pedido", "Pedido", "NORMAL"],
  ] as const) {
    db.categories.rows.push({ id: newId(), slug, name, defaultPriority, isActive: true, position: 1 });
  }
  generateBotReply.mockResolvedValue({ text: "Claro, te ayudo.", metadata: undefined, escalation: null, usedAI: false });
});

const ticketOf = (conversationId: string) => db.tickets.rows.find((t) => t.conversationId === conversationId);
const conversationRow = (id: string) => db.conversations.rows.find((c) => c.id === id)!;
const everything = () => JSON.stringify([db.messages.rows, db.conversations.rows, db.tickets.rows, logAdminAction.mock.calls, createNotification.mock.calls, sendEmail.mock.calls, generateBotReply.mock.calls]);

// ───────────────────────── nombre del agente ante el cliente ─────────────────────────

describe("cómo ve el cliente a quien lo atiende", () => {
  async function conversationAnsweredBy(agentRow: Record<string, unknown>) {
    const { conversation } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: agentRow.id as string, conversation: { status: "WITH_AGENT" } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "AGENT", visibility: "PUBLIC", body: "Hola, ya lo reviso.", senderId: agentRow.id } });
    return support.getConversation({ conversationId: conversation.id as string, userId: seed.customer.id });
  }

  it("con nombre de usuario elegido, ve ese nombre (y nunca el nombre real)", async () => {
    const agent = db.users.rows.find((row) => row.id === seed.agentA.id)!;
    agent.name = "Ana Martínez Quintanilla";
    agent.supportUsername = "ana.m";
    const dto = await conversationAnsweredBy(agent);
    expect(dto!.messages.at(-1)?.authorName).toBe("ana.m");
    expect(JSON.stringify(dto)).not.toContain("Quintanilla");
    expect(JSON.stringify(dto)).not.toContain("Martínez");
  });

  it("si todavía no eligió uno, solo ve su nombre de pila", async () => {
    const agent = db.users.rows.find((row) => row.id === seed.agentA.id)!;
    agent.name = "Ana Martínez Quintanilla";
    agent.supportUsername = null;
    const dto = await conversationAnsweredBy(agent);
    expect(dto!.messages.at(-1)?.authorName).toBe("Ana");
    expect(JSON.stringify(dto)).not.toContain("Quintanilla");
  });
});

// ───────────────────────────── notas internas ─────────────────────────────

describe("una nota interna JAMÁS llega al cliente", () => {
  const SECRET_NOTE = "NOTA SECRETA: el cliente tiene antecedentes de reclamos falsos";

  async function escalatedWithNote() {
    const { conversation, ticket } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id, conversation: { status: "WITH_AGENT" } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "AGENT", visibility: "PUBLIC", body: "Hola Carla, lo estamos revisando.", senderId: seed.agentA.id } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "AGENT", visibility: "INTERNAL", body: SECRET_NOTE, senderId: seed.agentA.id } });
    return { conversation, ticket };
  }

  it("getConversation devuelve solo mensajes públicos (y nada de la nota en ningún campo)", async () => {
    const { conversation } = await escalatedWithNote();
    const dto = await support.getConversation({ conversationId: conversation.id as string, userId: seed.customer.id });

    expect(dto).not.toBeNull();
    expect(dto!.messages.map((m) => m.body)).toEqual(["Mi pedido no llegó", "Hola Carla, lo estamos revisando."]);
    expect(JSON.stringify(dto)).not.toContain("SECRETA");
    expect(JSON.stringify(dto)).not.toContain("antecedentes");
  });

  it("tampoco al recuperar la conversación sin id (por la cuenta) ni después de enviar un mensaje", async () => {
    const { conversation } = await escalatedWithNote();
    const byAccount = await support.getConversation({ userId: seed.customer.id });
    expect(JSON.stringify(byAccount)).not.toContain("SECRETA");

    const afterSend = await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "¿Alguna novedad?" });
    expect(JSON.stringify(afterSend)).not.toContain("SECRETA");
    expect(afterSend.messages.at(-1)?.body).toBe("¿Alguna novedad?");
  });

  it("el historial que se le manda al asistente (IA) tampoco incluye notas internas", async () => {
    const conversation = await db.conversations.create({ data: { userId: seed.customer.id, status: "BOT" } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "USER", body: "hola", createdAt: new Date(Date.now() - 5000) } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "AGENT", visibility: "INTERNAL", body: SECRET_NOTE, createdAt: new Date(Date.now() - 4000) } });

    await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "necesito ayuda" });

    const history = generateBotReply.mock.calls[0]![0].history as { body: string }[];
    expect(history.map((entry) => entry.body)).toEqual(["hola", "necesito ayuda"]);
    expect(JSON.stringify(generateBotReply.mock.calls)).not.toContain("SECRETA");
  });

  it("el número de ticket sí se le muestra al cliente, sin más datos internos", async () => {
    const { conversation, ticket } = await escalatedWithNote();
    const dto = await support.getConversation({ conversationId: conversation.id as string, userId: seed.customer.id });
    expect(dto!.ticketCode).toBe(`T-${ticket.number}`);
    expect(Object.keys(dto!).sort()).toEqual(["canRate", "id", "messages", "rating", "status", "ticketCode"]);
  });
});

describe("el cliente solo accede a SU conversación (IDOR)", () => {
  it("otra cuenta, aun con el id correcto, no ve la conversación de una cuenta", async () => {
    const { conversation } = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id });
    const dto = await support.getConversation({ conversationId: conversation.id as string, userId: seed.otherCustomer.id });
    // Sin su propia conversación, no recibe nada (nunca la ajena).
    expect(dto).toBeNull();
  });

  it("escribir, calificar o cerrar la conversación de otra cuenta responde «no encontrada»", async () => {
    const { conversation } = await seedTicket(db, seed, { conversation: { status: "RESOLVED", resolvedAt: new Date() } });
    const intruder = { conversationId: conversation.id as string, userId: seed.otherCustomer.id };

    const messageCountBefore = db.messages.rows.length;
    const sent = await support.sendUserMessage({ ...intruder, userName: "Intruso", text: "hola" });
    // No se pudo escribir en la ajena: se abrió una conversación NUEVA del intruso.
    expect(sent.id).not.toBe(conversation.id);
    expect(db.messages.rows.filter((m) => m.conversationId === conversation.id)).toHaveLength(1);
    expect(db.messages.rows.length).toBe(messageCountBefore + 2);

    await expect(support.rateConversation({ ...intruder, rating: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(support.closeBotConversation(intruder)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(conversationRow(conversation.id as string).rating).toBeNull();
  });

  it("un visitante sin cuenta accede por el id (bearer) de su propia conversación", async () => {
    const { conversation } = await seedTicket(db, seed, { customerId: null, conversation: { userId: null, guestName: "Visita", guestEmail: "v@correo.com" } });
    const dto = await support.getConversation({ conversationId: conversation.id as string, userId: null });
    expect(dto?.id).toBe(conversation.id);
  });
});

// ───────────────────────────── datos sensibles ─────────────────────────────

describe("enmascarado de datos sensibles en el chat", () => {
  it("un DUI válido se oculta antes de guardar y antes de llegar al asistente; no queda en ningún lado", async () => {
    const dto = await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "Mi DUI es 04295342-7, ¿lo necesitan?" });

    const stored = db.messages.rows.find((m) => m.role === "USER")!;
    expect(stored.body).toBe("Mi DUI es [DUI oculto], ¿lo necesitan?");
    expect(stored.redacted).toBe(true);

    // El aviso de seguridad queda visible para la persona
    expect(dto.messages.some((m) => m.role === "BOT" && m.body.includes("ocultamos un dato sensible"))).toBe(true);

    // El asistente (y su proveedor de IA) recibió el texto ya enmascarado
    const history = generateBotReply.mock.calls[0]![0].history as { body: string }[];
    expect(history.at(-1)?.body).toBe("Mi DUI es [DUI oculto], ¿lo necesitan?");

    // Se registra QUE ocurrió (tipo), nunca el valor
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "support.message.redacted", metadata: { kinds: "DUI" } }));
    const serialized = everything();
    expect(serialized).not.toContain("04295342");
    expect(serialized).not.toContain("042953427");
  });

  it("una tarjeta válida (Luhn + marca) se oculta; el resto del mensaje se conserva", async () => {
    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "pagué con 4111 1111 1111 1111 y no llegó" });
    expect(db.messages.rows.find((m) => m.role === "USER")?.body).toBe("pagué con [tarjeta oculta] y no llegó");
    expect(everything()).not.toContain("4111");
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ metadata: { kinds: "CARD" } }));
  });

  it("un número de pedido, un teléfono o un número de 9 dígitos con verificador malo NO se tocan (sin falsos positivos)", async () => {
    const text = "Mi pedido MIMO-20260912-7AB12, mi cel 7899-1234 y la referencia 123456789";
    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text });
    const stored = db.messages.rows.find((m) => m.role === "USER")!;
    expect(stored.body).toBe(text);
    expect(stored.redacted).toBe(false);
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(db.messages.rows.some((m) => String(m.body).includes("ocultamos"))).toBe(false);
  });

  it("el motivo que escribe la persona al pedir hablar con alguien también se enmascara", async () => {
    await support.requestHuman({ userId: seed.customer.id, reason: "mi dui 04295342-7 no funciona" });
    expect(everything()).not.toContain("04295342");
    expect(String(conversationRow(db.conversations.rows[0]!.id as string).escalationReason)).toContain("[DUI oculto]");
  });
});

// ───────────────────────────── escalamiento ─────────────────────────────

describe("chatbot → ticket", () => {
  const escalation = { reason: "Cobro doble en un pedido", summary: "La persona dice que le cobraron dos veces.", category: "pago" };

  it("cuando el asistente escala, nace un ticket con el contexto de ESA conversación y escalatedFromBot = true", async () => {
    generateBotReply.mockResolvedValue({ text: "Te paso con una persona del equipo.", escalation, usedAI: true });
    const dto = await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "Me cobraron doble mi pedido" });

    const conversation = db.conversations.rows[0]!;
    const ticket = ticketOf(conversation.id as string)!;
    expect(ticket).toBeDefined();
    expect(ticket).toMatchObject({
      conversationId: conversation.id,
      customerId: seed.customer.id,
      source: "CHATBOT",
      escalatedFromBot: true,
      status: "NEW",
      assignedAgentId: null,
      kind: "CUSTOMER",
    });
    // El contexto se conserva en la conversación existente, sin duplicar mensajes
    expect(conversation).toMatchObject({ status: "WAITING_AGENT", summary: escalation.summary, escalationReason: escalation.reason });
    expect(db.messages.rows.filter((m) => m.conversationId === conversation.id).map((m) => m.role)).toEqual(["USER", "BOT"]);
    expect(dto.ticketCode).toBe(`T-${ticket.number}`);
    expect(dto.status).toBe("WAITING_AGENT");
  });

  it("la PRIORIDAD inicial la decide el servidor por la categoría, no la IA ni el cliente", async () => {
    // El modelo intenta imponer URGENT y una categoría inexistente: el servidor lo ignora.
    generateBotReply.mockResolvedValue({
      text: "ok",
      escalation: { ...escalation, category: "inexistente", priority: "URGENT" },
      usedAI: true,
    });
    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "Me cobraron doble mi pedido" });
    const ticket = db.tickets.rows[0]!;
    const category = db.categories.rows.find((c) => c.id === ticket.categoryId)!;

    expect(category.slug).toBe("pago"); // clasificada por el texto ("cobraron doble"), no por lo que dijo el modelo
    expect(ticket.priority).toBe("HIGH"); // = prioridad por defecto de la categoría
    expect(ticket.priority).not.toBe("URGENT");
  });

  it("si la IA propone una categoría válida y activa, se usa; una desactivada se descarta", async () => {
    db.categories.rows.find((c) => c.slug === "entrega")!.isActive = false;
    generateBotReply.mockResolvedValue({ text: "ok", escalation: { ...escalation, category: "entrega" }, usedAI: true });
    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "hola, quiero hablar con alguien" });
    const slug = db.categories.rows.find((c) => c.id === db.tickets.rows[0]!.categoryId)!.slug;
    expect(slug).not.toBe("entrega");
  });

  it("avisa al equipo (cola de agentes y supervisores) y por correo a la bandeja compartida", async () => {
    generateBotReply.mockResolvedValue({ text: "ok", escalation, usedAI: true });
    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "Me cobraron doble" });

    const notified = createNotification.mock.calls.map((call) => (call as unknown as [{ userId: string }])[0].userId).sort();
    expect(notified).toEqual([seed.agentA.id, seed.agentB.id, seed.manager.id].sort());
    expect(notified).not.toContain(seed.customer.id);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("vincula el pedido si el cliente menciona uno SUYO, y nunca uno ajeno", async () => {
    const own = db.orders.rows[db.orders.rows.push({ id: newId(), orderNumber: "MIMO-20260912-AB12C", buyerId: seed.customer.id, items: [{ businessId: "b1" }] }) - 1]!;
    db.orders.rows.push({ id: newId(), orderNumber: "MIMO-20260101-ZZ999", buyerId: seed.otherCustomer.id, items: [{ businessId: "b2" }] });
    generateBotReply.mockResolvedValue({ text: "ok", escalation, usedAI: true });

    await support.sendUserMessage({ userId: seed.customer.id, userName: "Carla", text: "Mi pedido MIMO-20260912-AB12C nunca llegó" });
    expect(db.tickets.rows[0]).toMatchObject({ orderId: own.id, businessId: "b1" });

    // Otra persona menciona el pedido de alguien más: no se vincula.
    db.conversations.rows.length = 0;
    db.tickets.rows.length = 0;
    db.messages.rows.length = 0;
    await support.sendUserMessage({ userId: seed.otherCustomer.id, userName: "Otro", text: "Mi pedido MIMO-20260912-AB12C nunca llegó" });
    expect(db.tickets.rows[0]!.orderId).toBeNull();
  });

  it("«Hablar con una persona» crea el ticket con origen CUSTOMER_REQUEST (no escalado por el asistente)", async () => {
    const dto = await support.requestHuman({ userId: seed.customer.id, reason: "Quiero hablar con alguien" });
    expect(db.tickets.rows[0]).toMatchObject({ source: "CUSTOMER_REQUEST", escalatedFromBot: false, status: "NEW" });
    expect(dto.ticketCode).toMatch(/^T-\d+$/);
    // y la confirmación lleva el código
    expect(dto.messages.some((m) => m.body.includes(dto.ticketCode!))).toBe(true);
  });

  it("pedirlo dos veces (o a la vez, con la conversación ya abierta) crea UN solo ticket", async () => {
    const conversation = await db.conversations.create({ data: { userId: seed.customer.id, status: "BOT" } });
    await db.messages.create({ data: { conversationId: conversation.id, role: "USER", body: "necesito ayuda" } });

    // El candado es el UPDATE condicionado a status = BOT: solo una de las dos llamadas escala.
    await Promise.all([
      support.requestHuman({ conversationId: conversation.id as string, userId: seed.customer.id, reason: "ayuda" }),
      support.requestHuman({ conversationId: conversation.id as string, userId: seed.customer.id, reason: "ayuda" }),
    ]);
    await support.requestHuman({ conversationId: conversation.id as string, userId: seed.customer.id, reason: "ayuda otra vez" });

    expect(db.tickets.rows).toHaveLength(1);
    expect(db.conversations.rows).toHaveLength(1);
    // un solo aviso al equipo
    expect(createNotification.mock.calls.length).toBe(3); // agentA, agentB, manager — una vez cada uno
  });

  it("un visitante sin correo no se deriva todavía: primero deja su contacto, y recién ahí nace el ticket (sin cuenta)", async () => {
    generateBotReply.mockResolvedValue({ text: "Dejame tus datos.", metadata: { requestContact: true }, escalation, usedAI: true });
    await support.sendUserMessage({ userId: null, userName: null, text: "Me cobraron doble" });
    expect(db.tickets.rows).toHaveLength(0);

    const conversationId = db.conversations.rows[0]!.id as string;
    await support.requestHuman({ conversationId, userId: null, guestName: "Visita", guestEmail: "visita@correo.com" });
    expect(db.tickets.rows[0]).toMatchObject({ conversationId, customerId: null });
    expect(conversationRow(conversationId)).toMatchObject({ guestName: "Visita", guestEmail: "visita@correo.com" });
  });
});

// ───────────────────────────── cliente responde ─────────────────────────────

describe("el cliente responde sobre un ticket", () => {
  it("si el ticket esperaba al cliente, vuelve a EN ATENCIÓN y avisa UNA sola vez al agente", async () => {
    const { conversation, ticket } = await seedTicket(db, seed, {
      status: "WAITING_CUSTOMER",
      assignedAgentId: seed.agentA.id,
      conversation: { status: "WITH_AGENT" },
    });
    db.tickets.rows[0]!.lastAgentMessageAt = new Date(Date.now() - 10_000);

    await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "Aquí va la foto del producto" });
    expect(db.tickets.rows[0]).toMatchObject({ status: "IN_PROGRESS" });
    expect(createNotification.mock.calls.map((c) => (c as unknown as [{ userId: string }])[0].userId)).toEqual([seed.agentA.id]);

    // un segundo mensaje seguido, sin que el equipo conteste: NO vuelve a avisar (anti-spam)
    await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "¿Me ven?" });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(ticket.id).toBe(db.tickets.rows[0]!.id);
  });

  it("un ticket RESUELTO se REABRE solo cuando el cliente responde (a EN ATENCIÓN si tiene dueño)", async () => {
    const { conversation } = await seedTicket(db, seed, {
      status: "RESOLVED",
      assignedAgentId: seed.agentA.id,
      conversation: { status: "RESOLVED", resolvedAt: new Date(Date.now() - 3_600_000) },
    });
    db.tickets.rows[0]!.resolvedAt = new Date(Date.now() - 3_600_000);

    const dto = await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "Sigue sin llegar" });

    expect(dto.id).toBe(conversation.id); // la MISMA conversación, no una nueva
    expect(db.tickets.rows[0]).toMatchObject({ status: "IN_PROGRESS", resolvedAt: null, reopenCount: 1 });
    expect(conversationRow(conversation.id as string)).toMatchObject({ status: "WITH_AGENT", resolvedAt: null });
    expect(dto.status).toBe("WITH_AGENT");
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ticket.reopened", metadata: { from: "RESOLVED", to: "IN_PROGRESS", by: "customer" } }));
    // y el agente se entera de que lo reabrió
    const notification = createNotification.mock.calls[0]![0];
    expect(notification.userId).toBe(seed.agentA.id);
    expect(notification.title).toContain("reabierto");
  });

  it("un ticket RESUELTO sin dueño se reabre a OPEN (vuelve a la cola) y avisa a la cola", async () => {
    const { conversation } = await seedTicket(db, seed, { status: "RESOLVED", conversation: { status: "RESOLVED", resolvedAt: new Date() } });
    await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "Aún necesito ayuda" });
    expect(db.tickets.rows[0]).toMatchObject({ status: "OPEN", reopenCount: 1 });
    expect(conversationRow(conversation.id as string).status).toBe("WAITING_AGENT");
    expect(createNotification).toHaveBeenCalled();
  });

  it("si la conversación resuelta ya no es visible (la calificó, o pasó más de un día), responder abre una conversación NUEVA", async () => {
    const rated = await seedTicket(db, seed, { status: "RESOLVED", assignedAgentId: seed.agentA.id, conversation: { status: "RESOLVED", resolvedAt: new Date(), rating: 5, ratedAt: new Date() } });
    const dto = await support.sendUserMessage({ conversationId: rated.conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "Hola de nuevo" });
    expect(dto.id).not.toBe(rated.conversation.id);
    expect(db.tickets.rows.find((t) => t.id === rated.ticket.id)).toMatchObject({ status: "RESOLVED", reopenCount: 0 });

    const old = await seedTicket(db, seed, { status: "RESOLVED", assignedAgentId: seed.agentA.id, conversation: { status: "RESOLVED", resolvedAt: new Date(Date.now() - 3 * 86_400_000) } });
    const second = await support.sendUserMessage({ conversationId: old.conversation.id as string, userId: seed.otherCustomer.id, userName: "X", text: "hola" });
    expect(second.id).not.toBe(old.conversation.id);
  });

  it("un ticket CERRADO no se reabre por escribir", async () => {
    const { conversation } = await seedTicket(db, seed, { status: "CLOSED", assignedAgentId: seed.agentA.id, conversation: { status: "RESOLVED", resolvedAt: new Date() } });
    const dto = await support.sendUserMessage({ conversationId: conversation.id as string, userId: seed.customer.id, userName: "Carla", text: "¿hola?" });
    expect(db.tickets.rows.find((t) => t.conversationId === conversation.id)).toMatchObject({ status: "CLOSED", reopenCount: 0 });
    expect(dto.id).not.toBe(conversation.id);
  });
});

// ───────────────────────────── CSAT ─────────────────────────────

describe("calificación (CSAT)", () => {
  async function resolved(overrides: Record<string, unknown> = {}) {
    return seedTicket(db, seed, { status: "RESOLVED", assignedAgentId: seed.agentA.id, conversation: { status: "RESOLVED", resolvedAt: new Date(), ...overrides } });
  }

  it("guarda la calificación 1–5, el comentario y la fecha", async () => {
    const { conversation, ticket } = await resolved();
    await support.rateConversation({ conversationId: conversation.id as string, userId: seed.customer.id, rating: 4, comment: "Muy amables" });
    expect(conversationRow(conversation.id as string)).toMatchObject({ rating: 4, ratingComment: "Muy amables" });
    expect(conversationRow(conversation.id as string).ratedAt).toBeInstanceOf(Date);
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ticket.rated", targetId: ticket.id, metadata: { rating: 4, length: 11 } }));
  });

  it("solo se puede calificar UNA vez por ticket (también si llegan dos envíos a la vez)", async () => {
    const { conversation } = await resolved();
    const results = await Promise.allSettled([
      support.rateConversation({ conversationId: conversation.id as string, userId: seed.customer.id, rating: 5 }),
      support.rateConversation({ conversationId: conversation.id as string, userId: seed.customer.id, rating: 1 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === "rejected")!;
    expect(rejected.reason).toMatchObject({ code: "ALREADY_RATED" });
    expect([5, 1]).toContain(conversationRow(conversation.id as string).rating);
    await expect(support.rateConversation({ conversationId: conversation.id as string, userId: seed.customer.id, rating: 3 })).rejects.toMatchObject({ code: "ALREADY_RATED" });
  });

  it("no se califica algo que sigue abierto, ni la conversación de otra persona", async () => {
    const open = await seedTicket(db, seed, { status: "IN_PROGRESS", assignedAgentId: seed.agentA.id, conversation: { status: "WITH_AGENT" } });
    await expect(support.rateConversation({ conversationId: open.conversation.id as string, userId: seed.customer.id, rating: 5 })).rejects.toMatchObject({ code: "NOT_RATEABLE" });

    const { conversation } = await resolved();
    await expect(support.rateConversation({ conversationId: conversation.id as string, userId: seed.otherCustomer.id, rating: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(conversationRow(conversation.id as string).rating).toBeNull();
  });

  it("un DUI escrito en el comentario también se oculta", async () => {
    const { conversation } = await resolved();
    await support.rateConversation({ conversationId: conversation.id as string, userId: seed.customer.id, rating: 5, comment: "mi dui 04295342-7" });
    expect(conversationRow(conversation.id as string).ratingComment).toBe("mi dui [DUI oculto]");
  });
});
