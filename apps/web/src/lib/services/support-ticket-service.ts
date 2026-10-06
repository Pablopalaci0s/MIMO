import { Prisma, prisma } from "@mimo/database";
import type {
  SupportMessageMetadata,
  SupportStaffMemberDTO,
  SupportTicketDetailDTO,
  SupportTicketListDTO,
  SupportTicketListItemDTO,
  SupportTicketMessageDTO,
  SupportTicketMessagesDTO,
  SupportTicketOrderCardDTO,
  SupportOrderAddressDTO,
  SupportTicketStatus,
  SupportTimelineEntryDTO,
} from "@mimo/types";
import {
  redactSensitive,
  type SupportTicketActionInput,
  type SupportTicketListQuery,
  type SupportTicketMessageInput,
} from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  ACTIVE_STATUSES,
  canTransition,
  can,
  computeViewCounts,
  conversationStatusFor,
  hasUnansweredCustomerMessage,
  isManager,
  parseTicketNumber,
  permissionsFor,
  ticketCode,
  type StaffActor,
} from "@/lib/support/ticket-rules";
import { logAdminAction } from "./admin-audit-service";
import { buildSupportReplyEmail, buildSupportTicketResolvedEmail, sendEmail } from "./email-service";
import { createNotification } from "./notification-service";
import {
  findOrderForLinking,
  getBusinessCard,
  getCustomerCard,
  getOrderAddress,
  getTicketOrderCard,
} from "./support-context-service";
import { logRedaction, ensureTicketsForEscalatedConversations } from "./support-ticket-intake-service";
import { notifyStaff, staffRecipientIds } from "./support-ticket-notify";

/**
 * Lado "equipo" del centro de soporte: bandeja, detalle, mensajes y acciones
 * sobre un ticket. CADA función recibe el `StaffActor` (resuelto en el
 * servidor desde la sesión y la base, nunca desde el cliente) y valida con
 * `can()` — un agente solo ve/actúa sobre lo suyo y la cola sin asignar.
 * Un ticket que el actor no puede ver responde 404 (no confirma que existe).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 30;
const TIMELINE_LIMIT = 50;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const notFound = () => new AppError("NOT_FOUND", "No encontramos ese ticket.", 404);

// ───────────────────────────── bandeja ─────────────────────────────

const LIST_SELECT = {
  id: true,
  number: true,
  subject: true,
  status: true,
  priority: true,
  assignedAgentId: true,
  escalatedFromBot: true,
  createdAt: true,
  updatedAt: true,
  lastCustomerMessageAt: true,
  lastAgentMessageAt: true,
  category: { select: { slug: true, name: true } },
  customer: { select: { name: true } },
  assignedAgent: { select: { name: true } },
  order: { select: { orderNumber: true } },
  business: { select: { name: true } },
  conversation: {
    select: {
      guestName: true,
      // Solo mensajes públicos: una nota interna nunca es la "vista previa" de nada que pueda salir.
      messages: { where: { visibility: "PUBLIC" as const }, orderBy: { createdAt: "desc" as const }, take: 1, select: { body: true } },
    },
  },
} satisfies Prisma.SupportTicketSelect;

type ListRow = Prisma.SupportTicketGetPayload<{ select: typeof LIST_SELECT }>;

function toListItem(row: ListRow): SupportTicketListItemDTO {
  const active = ACTIVE_STATUSES.includes(row.status);
  return {
    id: row.id,
    number: row.number,
    code: ticketCode(row.number),
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    customerName: row.customer?.name ?? row.conversation.guestName ?? "Visitante",
    isGuest: row.customer === null,
    orderNumber: row.order?.orderNumber ?? null,
    businessName: row.business?.name ?? null,
    assignedAgentId: row.assignedAgentId,
    assignedAgentName: row.assignedAgent?.name ?? null,
    escalatedFromBot: row.escalatedFromBot,
    needsReply: active && row.status !== "WAITING_CUSTOMER" && hasUnansweredCustomerMessage(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessagePreview: truncate(row.conversation.messages[0]?.body ?? "", 120),
  };
}

/** Lo que el actor puede ver: un agente, sus tickets + la cola sin asignar; supervisión, todo. */
function scopeWhere(actor: StaffActor): Prisma.SupportTicketWhereInput {
  if (isManager(actor)) return { kind: "CUSTOMER" };
  return {
    kind: "CUSTOMER",
    OR: [{ assignedAgentId: actor.id }, { assignedAgentId: null, status: { in: ["NEW", "OPEN"] } }],
  };
}

function viewWhere(view: SupportTicketListQuery["view"], actor: StaffActor): Prisma.SupportTicketWhereInput {
  switch (view) {
    case "nuevos":
      return { status: "NEW" };
    case "mios":
      return { assignedAgentId: actor.id, status: { in: ACTIVE_STATUSES } };
    case "sin_asignar":
      return { assignedAgentId: null, status: { in: ACTIVE_STATUSES } };
    case "en_atencion":
      return { status: "IN_PROGRESS" };
    case "esperando_cliente":
      return { status: "WAITING_CUSTOMER" };
    case "esperando_negocio":
      return { status: "WAITING_BUSINESS" };
    case "escalados":
      return { status: "ESCALATED" };
    case "resueltos":
      return { status: "RESOLVED" };
    case "cerrados":
      return { status: "CLOSED" };
    case "todos":
      return {};
  }
}

function filtersWhere(query: SupportTicketListQuery, actor: StaffActor): Prisma.SupportTicketWhereInput[] {
  const filters: Prisma.SupportTicketWhereInput[] = [];
  if (query.status) filters.push({ status: query.status });
  if (query.priority) filters.push({ priority: query.priority });
  if (query.category) filters.push({ category: { slug: query.category } });
  if (query.agent) {
    filters.push({ assignedAgentId: query.agent === "none" ? null : query.agent === "me" ? actor.id : query.agent });
  }
  // Fechas en UTC de punta a punta (ver CLAUDE.md: nunca mezclar con la hora local).
  if (query.from) filters.push({ createdAt: { gte: new Date(`${query.from}T00:00:00.000Z`) } });
  if (query.to) filters.push({ createdAt: { lte: new Date(`${query.to}T23:59:59.999Z`) } });
  if (query.q) {
    const contains = { contains: query.q, mode: "insensitive" as const };
    filters.push({
      OR: [
        { subject: contains },
        { customer: { name: contains } },
        { customer: { email: contains } },
        { conversation: { guestName: contains } },
        { conversation: { guestEmail: contains } },
      ],
    });
  }
  if (query.ticket) {
    const number = parseTicketNumber(query.ticket);
    const isUuid = /^[0-9a-f-]{36}$/i.test(query.ticket);
    filters.push(number !== null ? { number } : isUuid ? { id: query.ticket } : { id: "00000000-0000-0000-0000-000000000000" });
  }
  if (query.order) filters.push({ order: { orderNumber: { contains: query.order, mode: "insensitive" } } });
  if (query.business) filters.push({ business: { name: { contains: query.business, mode: "insensitive" } } });
  return filters;
}

export async function listTickets(actor: StaffActor, query: SupportTicketListQuery): Promise<SupportTicketListDTO> {
  // Red de seguridad: cualquier conversación ya escalada sin ticket lo recibe acá.
  await ensureTicketsForEscalatedConversations();

  const scope = scopeWhere(actor);
  const where: Prisma.SupportTicketWhereInput = { AND: [scope, viewWhere(query.view, actor), ...filtersWhere(query, actor)] };
  const historic = query.view === "resueltos" || query.view === "cerrados" || query.view === "todos";

  const [rows, total, grouped] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      select: LIST_SELECT,
      // Colas activas: lo más urgente primero y, a igual prioridad, lo que más espera.
      orderBy: historic ? [{ updatedAt: "desc" }] : [{ priority: "desc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.groupBy({ by: ["status", "assignedAgentId"], where: scope, _count: { _all: true } }),
  ]);

  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts: computeViewCounts(
      grouped.map((group) => ({ status: group.status, assignedAgentId: group.assignedAgentId, count: group._count._all })),
      actor.id,
    ),
  };
}

/** Contadores de todas las colas para la barra lateral (una sola consulta agrupada, con el alcance de quien pregunta). */
export async function getQueueCounts(actor: StaffActor): Promise<SupportTicketListDTO["counts"]> {
  const grouped = await prisma.supportTicket.groupBy({ by: ["status", "assignedAgentId"], where: scopeWhere(actor), _count: { _all: true } });
  return computeViewCounts(
    grouped.map((group) => ({ status: group.status, assignedAgentId: group.assignedAgentId, count: group._count._all })),
    actor.id,
  );
}

/** Cuántos tickets NUEVOS (sin atender) hay — para el resumen del panel de administración. */
export async function countNewTickets(): Promise<number> {
  return prisma.supportTicket.count({ where: { kind: "CUSTOMER", status: "NEW" } });
}

// ───────────────────────────── detalle ─────────────────────────────

const DETAIL_SELECT = {
  ...LIST_SELECT,
  conversationId: true,
  source: true,
  firstResponseAt: true,
  resolvedAt: true,
  closedAt: true,
  reopenCount: true,
  categoryId: true,
  orderId: true,
  businessId: true,
  customerId: true,
  conversation: {
    select: {
      guestName: true,
      guestEmail: true,
      summary: true,
      escalationReason: true,
      rating: true,
      ratingComment: true,
      messages: LIST_SELECT.conversation.select.messages,
    },
  },
} satisfies Prisma.SupportTicketSelect;

/** Solo estos datos de la auditoría se muestran en el historial del ticket. */
const SAFE_TIMELINE_KEYS = ["from", "to", "status", "priority", "category", "orderNumber", "self", "source", "escalatedFromBot", "length", "kinds", "by", "deleted"];

function safeDetail(metadata: unknown): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== "object") return {};
  const detail: Record<string, string | number | boolean | null> = {};
  for (const key of SAFE_TIMELINE_KEYS) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) detail[key] = value;
  }
  return detail;
}

/** Carga un ticket con lo mínimo para autorizar; 404 si no existe O si el actor no puede verlo. */
async function loadAccessibleTicket(actor: StaffActor, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, kind: "CUSTOMER" },
    select: {
      id: true,
      number: true,
      status: true,
      priority: true,
      assignedAgentId: true,
      categoryId: true,
      orderId: true,
      businessId: true,
      customerId: true,
      conversationId: true,
      firstResponseAt: true,
      lastCustomerMessageAt: true,
      lastAgentMessageAt: true,
    },
  });
  if (!ticket || !can(actor, "view", ticket)) throw notFound();
  return ticket;
}

export async function getTicketDetail(actor: StaffActor, id: string): Promise<SupportTicketDetailDTO> {
  const row = await prisma.supportTicket.findFirst({ where: { id, kind: "CUSTOMER" }, select: DETAIL_SELECT });
  if (!row || !can(actor, "view", row)) throw notFound();

  const [customer, order, business, timelineRows] = await Promise.all([
    getCustomerCard({
      customerId: row.customerId,
      currentTicketId: row.id,
      guestName: row.conversation.guestName,
      guestEmail: row.conversation.guestEmail,
    }),
    row.orderId ? getTicketOrderCard(row.orderId, row.customerId) : Promise.resolve(null),
    row.businessId ? getBusinessCard(row.businessId) : Promise.resolve(null),
    prisma.adminActionLog.findMany({
      where: { targetType: "SUPPORT_TICKET", targetId: row.id },
      orderBy: { createdAt: "desc" },
      take: TIMELINE_LIMIT,
      select: { action: true, createdAt: true, metadata: true, admin: { select: { name: true } } },
    }),
  ]);

  const timeline: SupportTimelineEntryDTO[] = timelineRows.map((entry) => ({
    action: entry.action,
    actorName: entry.admin?.name ?? null,
    createdAt: entry.createdAt.toISOString(),
    detail: safeDetail(entry.metadata),
  }));

  return {
    ticket: {
      ...toListItem(row),
      conversationId: row.conversationId,
      source: row.source,
      summary: row.conversation.summary,
      escalationReason: row.conversation.escalationReason,
      firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      reopenCount: row.reopenCount,
      rating: row.conversation.rating,
      ratingComment: row.conversation.ratingComment,
      categoryId: row.categoryId,
    },
    customer,
    order,
    business,
    timeline,
    permissions: permissionsFor(actor, row),
  };
}

// ───────────────────────────── mensajes ─────────────────────────────

const MESSAGE_SELECT = {
  id: true,
  role: true,
  visibility: true,
  body: true,
  redacted: true,
  metadata: true,
  createdAt: true,
  sender: { select: { name: true } },
} satisfies Prisma.SupportMessageSelect;

type MessageRow = Prisma.SupportMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

function toStaffMessage(row: MessageRow): SupportTicketMessageDTO {
  return {
    id: row.id,
    role: row.role,
    visibility: row.visibility,
    authorName: row.role === "AGENT" ? (row.sender?.name ?? "Equipo") : null,
    body: row.body,
    redacted: row.redacted,
    metadata: (row.metadata as SupportMessageMetadata | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Mensajes del ticket, por bloques: los últimos 30, `before` para ir hacia
 * atrás y `after` para el polling (solo lo nuevo). Incluye las notas internas
 * porque quien llega acá ya pasó `can(view)`.
 */
export async function listTicketMessages(
  actor: StaffActor,
  ticketId: string,
  cursor: { before?: string; after?: string } = {},
): Promise<SupportTicketMessagesDTO> {
  const ticket = await loadAccessibleTicket(actor, ticketId);

  if (cursor.after) {
    const rows = await prisma.supportMessage.findMany({
      where: { conversationId: ticket.conversationId, createdAt: { gt: new Date(cursor.after) } },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: MESSAGE_SELECT,
    });
    return { items: rows.map(toStaffMessage), hasMore: false, nextCursor: null };
  }

  const rows = await prisma.supportMessage.findMany({
    where: {
      conversationId: ticket.conversationId,
      ...(cursor.before ? { createdAt: { lt: new Date(cursor.before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE + 1,
    select: MESSAGE_SELECT,
  });
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  const page = rows.slice(0, MESSAGE_PAGE_SIZE).reverse();
  return { items: page.map(toStaffMessage), hasMore, nextCursor: hasMore ? (page[0]?.createdAt.toISOString() ?? null) : null };
}

// ───────────────────────────── acciones ─────────────────────────────

type LoadedTicket = Awaited<ReturnType<typeof loadAccessibleTicket>>;

async function audit(actor: StaffActor, action: string, ticketId: string, metadata?: Prisma.InputJsonObject): Promise<void> {
  await logAdminAction({ adminId: actor.id, action, targetType: "SUPPORT_TICKET", targetId: ticketId, metadata });
}

async function syncConversation(
  ticket: Pick<LoadedTicket, "conversationId">,
  status: SupportTicketStatus,
  assignedAgentId: string | null,
  extra: Prisma.SupportConversationUpdateInput = {},
): Promise<void> {
  await prisma.supportConversation.update({
    where: { id: ticket.conversationId },
    data: { status: conversationStatusFor(status, assignedAgentId !== null), assignedTo: assignedAgentId ? { connect: { id: assignedAgentId } } : { disconnect: true }, ...extra },
  });
}

/** Cambia el estado validando la transición y con un candado optimista (si alguien lo movió antes, falla). */
async function changeStatus(
  actor: StaffActor,
  ticket: LoadedTicket,
  to: SupportTicketStatus,
  options: { silent?: boolean } = {},
): Promise<void> {
  const from = ticket.status;
  if (!canTransition(from, to)) {
    throw new AppError("INVALID_TRANSITION", `No se puede pasar un ticket de ${from} a ${to}.`, 409);
  }

  // Reabrir es volver a trabajar un ticket terminado; pasar de RESUELTO a CERRADO es cerrarlo, no reabrirlo.
  const reopening = (from === "RESOLVED" || from === "CLOSED") && to !== "CLOSED";
  if (reopening && !can(actor, "reopen", ticket)) {
    throw new AppError("FORBIDDEN", "No tenés permiso para reabrir este ticket.", 403);
  }

  let assignedAgentId = ticket.assignedAgentId;
  // Un ticket sin dueño que empieza a atenderse pasa a ser de quien lo mueve; para esperar o resolver necesita dueño.
  if (assignedAgentId === null) {
    if (to === "IN_PROGRESS") assignedAgentId = actor.id;
    else if (["WAITING_CUSTOMER", "WAITING_BUSINESS", "RESOLVED"].includes(to)) {
      throw new AppError("NEEDS_ASSIGNEE", "Asigná o tomá el ticket antes de cambiar su estado.", 409);
    }
  }
  // Reabrir sin dueño lo devuelve a la cola; con dueño sigue con quien lo tenía.
  const target: SupportTicketStatus = reopening && assignedAgentId === null ? "OPEN" : to;

  const now = new Date();
  const result = await prisma.supportTicket.updateMany({
    where: { id: ticket.id, status: from },
    data: {
      status: target,
      assignedAgentId,
      ...(target === "RESOLVED" ? { resolvedAt: now, closedAt: null } : {}),
      ...(target === "CLOSED" ? { closedAt: now } : {}),
      ...(reopening ? { resolvedAt: null, closedAt: null, reopenCount: { increment: 1 } } : {}),
    },
  });
  if (result.count === 0) {
    throw new AppError("TICKET_CHANGED", "Otra persona modificó este ticket mientras lo mirabas. Recargá e intentá de nuevo.", 409);
  }

  await syncConversation(ticket, target, assignedAgentId, {
    ...(target === "RESOLVED" ? { resolvedAt: now, lastMessageAt: now } : {}),
    ...(reopening ? { resolvedAt: null, lastMessageAt: now } : {}),
  });
  await audit(actor, reopening ? "ticket.reopened" : target === "RESOLVED" ? "ticket.resolved" : target === "CLOSED" ? "ticket.closed" : "ticket.status_changed", ticket.id, {
    from,
    to: target,
  });

  if (target === "RESOLVED" && !options.silent) await announceResolution(ticket);
}

/** Al resolver: mensaje público en el chat (invita a calificar), aviso en la app y correo. */
async function announceResolution(ticket: LoadedTicket): Promise<void> {
  try {
    await prisma.supportMessage.create({
      data: {
        conversationId: ticket.conversationId,
        role: "BOT",
        body: `El equipo de soporte marcó tu consulta ${ticketCode(ticket.number)} como resuelta. Si todavía necesitás algo, escribinos de nuevo en este mismo chat. ¿Cómo fue la atención?`,
      },
    });
    const contact = await customerContact(ticket.conversationId);
    if (contact.userId) {
      await createNotification({
        userId: contact.userId,
        type: "SUPPORT_MESSAGE",
        title: `Tu consulta ${ticketCode(ticket.number)} se resolvió`,
        body: "Contanos cómo fue la atención.",
        linkHref: "/soporte",
      });
    }
    if (contact.email) {
      const email = buildSupportTicketResolvedEmail({ customerName: contact.name, ticketCode: ticketCode(ticket.number), chatUrl: contact.chatUrl });
      await sendEmail({ to: contact.email, ...email });
    }
  } catch (error) {
    logger.error("No se pudo avisar al cliente de la resolución", { ticketId: ticket.id, error: String(error) });
  }
}

async function customerContact(conversationId: string) {
  const conversation = await prisma.supportConversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { id: true, userId: true, guestName: true, guestEmail: true, user: { select: { name: true, email: true } } },
  });
  return {
    userId: conversation.userId,
    name: conversation.user?.name ?? conversation.guestName ?? "",
    email: conversation.user?.email ?? conversation.guestEmail ?? null,
    chatUrl: conversation.userId ? `${APP_URL}/soporte` : `${APP_URL}/soporte?c=${conversation.id}`,
  };
}

const TAKEABLE_FOR_AGENT: SupportTicketStatus[] = ["NEW", "OPEN"];
const TAKEABLE_FOR_MANAGER: SupportTicketStatus[] = ["NEW", "OPEN", "ESCALATED"];

async function takeTicket(actor: StaffActor, ticket: LoadedTicket): Promise<void> {
  if (!can(actor, "take", ticket)) {
    throw new AppError("TICKET_UNAVAILABLE", "Este ticket ya no está disponible para tomarlo.", 409);
  }
  // Candado atómico: el `where` exige que siga sin dueño y en la cola. Si dos
  // agentes tocan "Tomar" a la vez, la base le concede el UPDATE a uno solo.
  const result = await prisma.supportTicket.updateMany({
    where: {
      id: ticket.id,
      assignedAgentId: null,
      status: { in: isManager(actor) ? TAKEABLE_FOR_MANAGER : TAKEABLE_FOR_AGENT },
    },
    data: { assignedAgentId: actor.id, status: "IN_PROGRESS" },
  });
  if (result.count === 0) {
    throw new AppError("TICKET_ALREADY_TAKEN", "Otra persona del equipo ya tomó este ticket.", 409);
  }
  await syncConversation(ticket, "IN_PROGRESS", actor.id);
  await audit(actor, "ticket.assigned", ticket.id, { to: actor.id, self: true });
}

async function releaseTicket(actor: StaffActor, ticket: LoadedTicket): Promise<void> {
  if (!can(actor, "release", ticket)) throw new AppError("FORBIDDEN", "No podés liberar este ticket.", 403);
  const result = await prisma.supportTicket.updateMany({
    where: { id: ticket.id, assignedAgentId: ticket.assignedAgentId, status: ticket.status },
    data: { assignedAgentId: null, status: "OPEN" },
  });
  if (result.count === 0) throw new AppError("TICKET_CHANGED", "El ticket cambió mientras lo mirabas. Recargá.", 409);
  await syncConversation(ticket, "OPEN", null);
  await audit(actor, "ticket.released", ticket.id, { from: ticket.assignedAgentId });
}

async function assignTicket(actor: StaffActor, ticket: LoadedTicket, agentId: string): Promise<void> {
  if (!can(actor, "assign", ticket)) throw new AppError("FORBIDDEN", "Solo supervisión puede asignar tickets.", 403);

  // El destino tiene que ser personal de soporte real y activo (nunca un id cualquiera).
  const target = await prisma.user.findFirst({
    where: { id: agentId, deletedAt: null, role: { in: ["SUPPORT_AGENT", "SUPPORT_MANAGER", "ADMIN"] } },
    select: { id: true, name: true },
  });
  if (!target) throw new AppError("INVALID_AGENT", "Esa persona no es del equipo de soporte.", 400);

  const nextStatus: SupportTicketStatus = ticket.status === "NEW" || ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status;
  const result = await prisma.supportTicket.updateMany({
    where: { id: ticket.id, status: ticket.status },
    data: { assignedAgentId: target.id, status: nextStatus },
  });
  if (result.count === 0) throw new AppError("TICKET_CHANGED", "El ticket cambió mientras lo mirabas. Recargá.", 409);

  await syncConversation(ticket, nextStatus, target.id);
  await audit(actor, ticket.assignedAgentId ? "ticket.reassigned" : "ticket.assigned", ticket.id, {
    from: ticket.assignedAgentId,
    to: target.id,
    self: target.id === actor.id,
  });
  if (target.id !== actor.id) {
    await notifyStaff([target.id], {
      title: `Te asignaron el ticket ${ticketCode(ticket.number)}`,
      body: "Abrilo para ver el contexto del cliente.",
      ticketId: ticket.id,
    });
  }
}

export async function performTicketAction(actor: StaffActor, ticketId: string, input: SupportTicketActionInput): Promise<void> {
  const ticket = await loadAccessibleTicket(actor, ticketId);

  switch (input.action) {
    case "take":
      return takeTicket(actor, ticket);
    case "release":
      return releaseTicket(actor, ticket);
    case "assign":
      return assignTicket(actor, ticket, input.agentId);

    case "status": {
      // Reabrir y cambiar de estado tienen permisos distintos: lo resuelve changeStatus con `can`.
      const reopening = (ticket.status === "RESOLVED" || ticket.status === "CLOSED") && input.status !== "CLOSED";
      if (!reopening && !can(actor, "status", ticket)) throw new AppError("FORBIDDEN", "No podés cambiar el estado de este ticket.", 403);
      return changeStatus(actor, ticket, input.status);
    }

    case "priority": {
      if (!can(actor, "priority", ticket)) throw new AppError("FORBIDDEN", "No podés cambiar la prioridad de este ticket.", 403);
      if (input.priority === ticket.priority) return;
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { priority: input.priority } });
      await audit(actor, "ticket.priority_changed", ticket.id, { from: ticket.priority, to: input.priority });
      if (input.priority === "URGENT") {
        const managers = await staffRecipientIds("managers", actor.id);
        await notifyStaff(managers, { title: `Ticket urgente ${ticketCode(ticket.number)}`, body: "Se marcó como urgente.", ticketId: ticket.id });
      }
      return;
    }

    case "category": {
      if (!can(actor, "category", ticket)) throw new AppError("FORBIDDEN", "No podés cambiar la categoría de este ticket.", 403);
      const category = await prisma.supportCategory.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true, slug: true } });
      if (!category) throw new AppError("INVALID_CATEGORY", "Esa categoría no existe o está desactivada.", 400);
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { categoryId: category.id } });
      await audit(actor, "ticket.category_changed", ticket.id, { to: category.slug });
      return;
    }

    case "link_order": {
      if (!can(actor, "link", ticket)) throw new AppError("FORBIDDEN", "No podés vincular pedidos a este ticket.", 403);
      const order = await findOrderForLinking(input.orderNumber);
      if (!order) throw new AppError("ORDER_NOT_FOUND", "No encontramos un pedido con ese número.", 404);
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          orderId: order.id,
          // Si el pedido es de un solo negocio y el ticket todavía no tiene uno, se vincula también.
          ...(ticket.businessId === null && order.businessIds.length === 1 ? { businessId: order.businessIds[0] } : {}),
        },
      });
      await audit(actor, "ticket.order_linked", ticket.id, {
        orderNumber: input.orderNumber,
        // Aviso para quien revisa: el pedido NO es de este cliente.
        ownedByCustomer: ticket.customerId === null ? null : order.buyerId === ticket.customerId,
      });
      return;
    }
    case "unlink_order": {
      if (!can(actor, "link", ticket)) throw new AppError("FORBIDDEN", "No podés desvincular pedidos de este ticket.", 403);
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { orderId: null } });
      await audit(actor, "ticket.order_unlinked", ticket.id);
      return;
    }
    case "link_business": {
      if (!can(actor, "link", ticket)) throw new AppError("FORBIDDEN", "No podés vincular negocios a este ticket.", 403);
      const business = await prisma.business.findFirst({ where: { id: input.businessId, deletedAt: null }, select: { id: true } });
      if (!business) throw new AppError("BUSINESS_NOT_FOUND", "No encontramos ese negocio.", 404);
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { businessId: business.id } });
      await audit(actor, "ticket.business_linked", ticket.id);
      return;
    }
    case "unlink_business": {
      if (!can(actor, "link", ticket)) throw new AppError("FORBIDDEN", "No podés desvincular negocios de este ticket.", 403);
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { businessId: null } });
      await audit(actor, "ticket.business_unlinked", ticket.id);
      return;
    }

    case "escalate": {
      if (!can(actor, "escalate", ticket)) throw new AppError("FORBIDDEN", "No podés escalar este ticket.", 403);
      await changeStatus(actor, ticket, "ESCALATED");
      // El motivo queda como nota interna (nunca visible para el cliente) y avisa a supervisión.
      const reason = redactSensitive(input.reason);
      await prisma.supportMessage.create({
        data: { conversationId: ticket.conversationId, role: "AGENT", visibility: "INTERNAL", senderId: actor.id, body: `Escalado: ${reason.text}`, redacted: reason.redacted },
      });
      await audit(actor, "ticket.escalated", ticket.id, { length: reason.text.length });
      const managers = await staffRecipientIds("managers", actor.id);
      await notifyStaff(managers, { title: `Ticket escalado ${ticketCode(ticket.number)}`, body: truncate(reason.text, 140), ticketId: ticket.id });
      return;
    }
  }
}

// ───────────────────── responder al cliente / nota interna ─────────────────────

export async function postTicketMessage(
  actor: StaffActor,
  ticketId: string,
  input: SupportTicketMessageInput,
): Promise<{ redacted: boolean }> {
  const ticket = await loadAccessibleTicket(actor, ticketId);
  const isNote = input.kind === "note";
  if (!can(actor, isNote ? "note" : "reply", ticket)) {
    throw new AppError(
      "FORBIDDEN",
      isNote ? "No podés agregar notas a este ticket." : "No podés responder este ticket: tomalo primero, o está resuelto o cerrado.",
      403,
    );
  }

  // También lo que escribe el equipo pasa por el enmascarado: si alguien pega un DUI, no se guarda.
  const redaction = redactSensitive(input.body);
  const now = new Date();

  await prisma.supportMessage.create({
    data: {
      conversationId: ticket.conversationId,
      role: "AGENT",
      // La visibilidad la decide el SERVIDOR por el tipo de acción, nunca un campo del cliente.
      visibility: isNote ? "INTERNAL" : "PUBLIC",
      senderId: actor.id,
      body: redaction.text,
      redacted: redaction.redacted,
    },
  });
  if (redaction.redacted) await logRedaction(ticket.conversationId, redaction.kinds);

  if (isNote) {
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: now } });
    await audit(actor, "ticket.note_added", ticket.id, { length: redaction.text.length });
    return { redacted: redaction.redacted };
  }

  const waiting = input.waitForCustomer === true && canTransition(ticket.status, "WAITING_CUSTOMER");
  const nextStatus: SupportTicketStatus = waiting ? "WAITING_CUSTOMER" : ticket.status;
  // ¿Es la primera respuesta desde que el cliente escribió? Solo esa va también por correo.
  const firstSinceCustomer = hasUnansweredCustomerMessage(ticket) || ticket.lastAgentMessageAt === null;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      lastAgentMessageAt: now,
      firstResponseAt: ticket.firstResponseAt ?? now,
      ...(waiting ? { status: nextStatus } : {}),
    },
  });
  await syncConversation(ticket, nextStatus, ticket.assignedAgentId, { lastMessageAt: now });
  await audit(actor, "ticket.message_sent", ticket.id, { length: redaction.text.length, ...(waiting ? { to: "WAITING_CUSTOMER" } : {}) });

  await notifyCustomerOfReply(ticket, redaction.text, firstSinceCustomer);
  return { redacted: redaction.redacted };
}

async function notifyCustomerOfReply(ticket: LoadedTicket, text: string, sendEmailToo: boolean): Promise<void> {
  try {
    const contact = await customerContact(ticket.conversationId);
    if (contact.userId) {
      await createNotification({
        userId: contact.userId,
        type: "SUPPORT_MESSAGE",
        title: "El equipo de MIMO te respondió",
        body: truncate(text, 140),
        linkHref: "/soporte",
      });
    }
    // Un correo por ronda de conversación, no por cada mensaje del agente.
    if (contact.email && sendEmailToo) {
      const email = buildSupportReplyEmail({
        customerName: contact.name,
        preview: truncate(text, 400),
        chatUrl: contact.chatUrl,
        ticketCode: ticketCode(ticket.number),
      });
      await sendEmail({ to: contact.email, ...email });
    }
  } catch (error) {
    // La respuesta ya quedó guardada y visible en el chat; el aviso es un extra.
    logger.error("No se pudo avisar al cliente de la respuesta", { ticketId: ticket.id, error: String(error) });
  }
}

// ───────────────────── dirección de entrega (acceso auditado) ─────────────────────

/**
 * La dirección completa NO viaja con el ticket: se pide aparte, con un clic, y
 * cada vez queda en la auditoría (quién, cuándo, de qué ticket).
 */
export async function revealOrderAddress(actor: StaffActor, ticketId: string): Promise<SupportOrderAddressDTO> {
  const ticket = await loadAccessibleTicket(actor, ticketId);
  if (ticket.assignedAgentId !== actor.id && !isManager(actor)) {
    throw new AppError("FORBIDDEN", "Solo quien atiende el ticket puede ver la dirección de entrega.", 403);
  }
  if (!ticket.orderId) throw new AppError("NO_ORDER", "Este ticket no tiene un pedido vinculado.", 400);

  const address = await getOrderAddress(ticket.orderId);
  if (!address) throw new AppError("NO_ADDRESS", "El pedido no tiene dirección de entrega.", 404);
  await audit(actor, "ticket.address_viewed", ticket.id);
  return address;
}

// ───────────────────────────── equipo ─────────────────────────────

/** Personal de soporte disponible para asignar (solo supervisión), con su carga actual. */
export async function listSupportStaff(): Promise<SupportStaffMemberDTO[]> {
  const [users, load] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, role: { in: ["SUPPORT_AGENT", "SUPPORT_MANAGER", "ADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.supportTicket.groupBy({
      by: ["assignedAgentId"],
      where: { kind: "CUSTOMER", assignedAgentId: { not: null }, status: { in: ACTIVE_STATUSES } },
      _count: { _all: true },
    }),
  ]);
  const byAgent = new Map(load.map((row) => [row.assignedAgentId, row._count._all]));
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role as SupportStaffMemberDTO["role"],
    activeTickets: byAgent.get(user.id) ?? 0,
  }));
}

export type { SupportTicketOrderCardDTO };
