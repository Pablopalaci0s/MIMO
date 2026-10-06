import { Prisma, prisma } from "@mimo/database";
import type { SupportMessageMetadata, SupportTicketSource } from "@mimo/types";
import { redactSensitive } from "@mimo/validation";
import { logger } from "@/lib/logger";
import { extractOrderNumber } from "@/lib/support/bot-rules";
import {
  classifyCategory,
  conversationStatusFor,
  hasUnansweredCustomerMessage,
  statusAfterCustomerMessage,
  ticketCode,
} from "@/lib/support/ticket-rules";
import { logAdminAction } from "./admin-audit-service";
import {
  buildSupportEscalationEmail,
  buildSupportTicketCreatedEmail,
  sendEmail,
} from "./email-service";
import { staffRecipientIds, notifyStaff, ticketHref } from "./support-ticket-notify";

/**
 * Lado "cliente → ticket" del centro de soporte: crea tickets cuando una
 * conversación se escala (el asistente, el botón "Hablar con una persona" o
 * el formulario de /ayuda) y reacciona cuando el cliente vuelve a escribir.
 *
 * NO duplica la conversación: el ticket apunta a la `SupportConversation`
 * existente, de donde el agente lee el resumen, el motivo y los mensajes.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "soporte@mimo.sv";
/** Cuántos mensajes recientes del cliente se miran para clasificar y buscar un pedido. */
const CONTEXT_MESSAGES = 15;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function chatUrlFor(conversation: { id: string; userId: string | null }): string {
  return conversation.userId ? `${APP_URL}/soporte` : `${APP_URL}/soporte?c=${conversation.id}`;
}

export interface NewTicketOptions {
  source: SupportTicketSource;
  /** true si el asistente (IA o reglas) decidió pasar a una persona. */
  escalatedFromBot: boolean;
  /** Categoría sugerida (por la IA); se valida contra las categorías activas. */
  categorySlug?: string | null;
  /** Conversación escalada ANTES de que existieran los tickets: copia su estado y no avisa al cliente. */
  fromExisting?: boolean;
}

export interface CreatedTicket {
  id: string;
  number: number;
  code: string;
  created: boolean;
}

/** Categoría activa por slug, o la mejor alternativa (nunca falla si hay al menos una activa). */
async function pickCategory(slug: string | null | undefined, fallbackText: string) {
  if (slug) {
    const proposed = await prisma.supportCategory.findFirst({ where: { slug, isActive: true } });
    if (proposed) return proposed;
  }
  const classified = await prisma.supportCategory.findFirst({ where: { slug: classifyCategory(fallbackText), isActive: true } });
  if (classified) return classified;
  const other = await prisma.supportCategory.findFirst({ where: { slug: "otro", isActive: true } });
  if (other) return other;
  const any = await prisma.supportCategory.findFirst({ where: { isActive: true }, orderBy: { position: "asc" } });
  if (!any) throw new Error("No hay ninguna categoría de soporte activa");
  return any;
}

/**
 * Crea el ticket de una conversación (idempotente: si ya tiene, lo devuelve).
 * La prioridad inicial la decide el SERVIDOR a partir de la categoría; ni el
 * cliente ni la IA pueden fijarla.
 */
export async function createTicketForConversation(conversationId: string, options: NewTicketOptions): Promise<CreatedTicket> {
  const conversation = await prisma.supportConversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: {
      id: true,
      userId: true,
      guestName: true,
      guestEmail: true,
      status: true,
      summary: true,
      escalationReason: true,
      assignedToId: true,
      resolvedAt: true,
      user: { select: { name: true, email: true } },
      ticket: { select: { id: true, number: true } },
      // Solo mensajes PÚBLICOS: las notas internas nunca alimentan la clasificación.
      messages: {
        where: { visibility: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        take: CONTEXT_MESSAGES,
        select: { role: true, body: true, metadata: true, createdAt: true },
      },
    },
  });
  if (conversation.ticket) {
    return { id: conversation.ticket.id, number: conversation.ticket.number, code: ticketCode(conversation.ticket.number), created: false };
  }

  const chronological = [...conversation.messages].reverse();
  const userMessages = chronological.filter((message) => message.role === "USER");
  const classificationText = [conversation.escalationReason, ...userMessages.slice(-5).map((message) => message.body)]
    .filter(Boolean)
    .join(" ");
  const category = await pickCategory(options.categorySlug, classificationText);

  // Pedido relacionado: el número que el cliente escribió o el que el asistente le mostró,
  // y SOLO si es un pedido de esa misma cuenta (un visitante no vincula pedidos).
  let orderId: string | null = null;
  let businessId: string | null = null;
  if (conversation.userId) {
    const candidates = [
      ...userMessages.map((message) => extractOrderNumber(message.body)),
      ...chronological.map((message) => (message.metadata as SupportMessageMetadata | null)?.order?.orderNumber ?? null),
    ].filter((value): value is string => Boolean(value));
    const orderNumber = candidates.at(-1);
    if (orderNumber) {
      const order = await prisma.order.findFirst({
        where: { orderNumber, buyerId: conversation.userId },
        select: { id: true, items: { select: { businessId: true } } },
      });
      if (order) {
        orderId = order.id;
        const businessIds = [...new Set(order.items.map((item) => item.businessId))];
        if (businessIds.length === 1) businessId = businessIds[0]!;
      }
    }
  }

  const subject = truncate(userMessages[0]?.body ?? conversation.escalationReason ?? "Consulta de soporte", 100) || "Consulta de soporte";
  const lastUser = userMessages.at(-1)?.createdAt ?? null;
  const lastAgent = chronological.filter((message) => message.role === "AGENT").at(-1)?.createdAt ?? null;
  const firstAgent = chronological.find((message) => message.role === "AGENT")?.createdAt ?? null;

  const existingStatus =
    conversation.status === "RESOLVED"
      ? "RESOLVED"
      : conversation.status === "WITH_AGENT"
        ? conversation.assignedToId
          ? "IN_PROGRESS"
          : "OPEN"
        : "NEW";
  const status = options.fromExisting ? existingStatus : "NEW";
  const assignedAgentId = options.fromExisting ? conversation.assignedToId : null;

  let ticket: { id: string; number: number };
  try {
    ticket = await prisma.supportTicket.create({
      data: {
        kind: "CUSTOMER",
        conversationId,
        customerId: conversation.userId,
        orderId,
        businessId,
        assignedAgentId,
        categoryId: category.id,
        status,
        priority: category.defaultPriority,
        subject,
        source: options.source,
        escalatedFromBot: options.escalatedFromBot,
        firstResponseAt: options.fromExisting ? firstAgent : null,
        resolvedAt: options.fromExisting && status === "RESOLVED" ? (conversation.resolvedAt ?? new Date()) : null,
        lastCustomerMessageAt: lastUser,
        lastAgentMessageAt: lastAgent,
      },
      select: { id: true, number: true },
    });
  } catch (error) {
    // Dos caminos escalaron a la vez: gana el primero, el otro devuelve ese mismo ticket.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.supportTicket.findUniqueOrThrow({
        where: { conversationId },
        select: { id: true, number: true },
      });
      return { id: existing.id, number: existing.number, code: ticketCode(existing.number), created: false };
    }
    throw error;
  }

  const code = ticketCode(ticket.number);
  await logAdminAction({
    adminId: null,
    action: "ticket.created",
    targetType: "SUPPORT_TICKET",
    targetId: ticket.id,
    metadata: {
      source: options.source,
      category: category.slug,
      priority: category.defaultPriority,
      escalatedFromBot: options.escalatedFromBot,
      linkedOrder: orderId !== null,
    },
  });

  const customerName = conversation.user?.name ?? conversation.guestName ?? "Un visitante";
  const customerEmail = conversation.user?.email ?? conversation.guestEmail ?? null;

  if (!options.fromExisting || status === "NEW") {
    await notifyNewTicket({
      ticketId: ticket.id,
      code,
      customerName,
      customerEmail,
      subject,
      priority: category.defaultPriority,
      reason: conversation.escalationReason,
      summary: conversation.summary,
    });
  }
  if (!options.fromExisting && customerEmail) {
    const email = buildSupportTicketCreatedEmail({
      customerName,
      ticketCode: code,
      subject,
      chatUrl: chatUrlFor(conversation),
    });
    await sendEmail({ to: customerEmail, ...email }).catch((error) =>
      logger.error("No se pudo confirmar el ticket por correo", { ticketId: ticket.id, error: String(error) }),
    );
  }

  return { id: ticket.id, number: ticket.number, code, created: true };
}

async function notifyNewTicket(input: {
  ticketId: string;
  code: string;
  customerName: string;
  customerEmail: string | null;
  subject: string;
  priority: string;
  reason: string | null;
  summary: string | null;
}): Promise<void> {
  try {
    const urgent = input.priority === "URGENT";
    const recipients = await staffRecipientIds("queue");
    await notifyStaff(recipients, {
      title: urgent ? `Ticket urgente ${input.code}` : `Nuevo ticket ${input.code}`,
      body: truncate(`${input.customerName}: ${input.subject}`, 140),
      ticketId: input.ticketId,
    });
    // Un ticket urgente además le llega a supervisión aunque no esté en la cola de agentes.
    if (urgent) {
      const managers = (await staffRecipientIds("managers")).filter((id) => !recipients.includes(id));
      await notifyStaff(managers, { title: `Ticket urgente ${input.code}`, body: truncate(`${input.customerName}: ${input.subject}`, 140), ticketId: input.ticketId });
    }

    // La bandeja compartida de soporte sigue recibiendo el aviso por correo, como antes.
    const email = buildSupportEscalationEmail({
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      reason: input.reason,
      summary: input.summary,
      adminUrl: `${APP_URL}${ticketHref(input.ticketId)}`,
      ticketCode: input.code,
    });
    await sendEmail({ to: SUPPORT_EMAIL, ...email });
  } catch (error) {
    // Un aviso que falla nunca debe tumbarle el chat a quien lo pidió.
    logger.error("Falló el aviso de un ticket nuevo", { ticketId: input.ticketId, error: String(error) });
  }
}

// ───────────────────────── red de seguridad ─────────────────────────

let lastReconcileAt = 0;

/**
 * Cualquier conversación ya escalada que, por la razón que sea (un servidor
 * viejo, un error a mitad de camino), todavía no tenga ticket lo recibe acá.
 * Se llama al abrir la bandeja y como mucho una vez por minuto.
 */
export async function ensureTicketsForEscalatedConversations(): Promise<number> {
  if (Date.now() - lastReconcileAt < 60_000) return 0;
  lastReconcileAt = Date.now();

  const orphans = await prisma.supportConversation.findMany({
    where: { escalatedAt: { not: null }, status: { in: ["WAITING_AGENT", "WITH_AGENT", "RESOLVED"] }, ticket: null },
    select: { id: true },
    take: 25,
  });
  for (const orphan of orphans) {
    try {
      await createTicketForConversation(orphan.id, { source: "CHATBOT", escalatedFromBot: true, fromExisting: true });
    } catch (error) {
      logger.error("No se pudo crear el ticket de una conversación escalada", { conversationId: orphan.id, error: String(error) });
    }
  }
  return orphans.length;
}

// ─────────────────── el cliente escribe sobre un ticket ───────────────────

/**
 * El cliente escribió en una conversación que ya tiene ticket. Actualiza los
 * tiempos, devuelve el ticket a atención si esperaba al cliente, REABRE uno
 * resuelto, y avisa al equipo UNA vez (no por cada mensaje seguido).
 * `preview` ya viene con los datos sensibles ocultos.
 */
export async function registerCustomerMessage(conversationId: string, preview: string): Promise<void> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { conversationId },
    select: {
      id: true,
      number: true,
      status: true,
      assignedAgentId: true,
      lastCustomerMessageAt: true,
      lastAgentMessageAt: true,
      customer: { select: { name: true } },
      conversation: { select: { guestName: true } },
    },
  });
  if (!ticket) return;

  const now = new Date();
  const assigned = ticket.assignedAgentId !== null;
  const next = statusAfterCustomerMessage(ticket.status, assigned);
  const alreadyUnanswered = hasUnansweredCustomerMessage(ticket);

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      lastCustomerMessageAt: now,
      ...(next.status !== ticket.status ? { status: next.status } : {}),
      ...(next.reopened ? { resolvedAt: null, reopenCount: { increment: 1 } } : {}),
    },
  });
  if (next.status !== ticket.status) {
    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { status: conversationStatusFor(next.status, assigned), ...(next.reopened ? { resolvedAt: null } : {}) },
    });
    await logAdminAction({
      adminId: null,
      action: next.reopened ? "ticket.reopened" : "ticket.status_changed",
      targetType: "SUPPORT_TICKET",
      targetId: ticket.id,
      metadata: { from: ticket.status, to: next.status, by: "customer" },
    });
  }

  // Anti-spam: un solo aviso mientras haya un mensaje del cliente sin contestar
  // (salvo que acabe de reabrir un ticket resuelto, que siempre merece aviso).
  if (alreadyUnanswered && !next.reopened) return;
  try {
    const code = ticketCode(ticket.number);
    const who = ticket.customer?.name ?? ticket.conversation.guestName ?? "El cliente";
    const recipients = ticket.assignedAgentId ? [ticket.assignedAgentId] : await staffRecipientIds("queue");
    await notifyStaff(recipients, {
      title: next.reopened ? `${code} reabierto: ${who} respondió` : `${who} respondió en ${code}`,
      body: truncate(preview, 140),
      ticketId: ticket.id,
    });
  } catch (error) {
    logger.error("No se pudo avisar de un mensaje nuevo del cliente", { ticketId: ticket.id, error: String(error) });
  }
}

// ───────────────────────── formulario de /ayuda ─────────────────────────

/**
 * El formulario de contacto de /ayuda ahora abre un ticket (antes solo mandaba
 * un correo): crea la conversación con el mensaje de la persona y el ticket.
 */
export async function createTicketFromForm(input: {
  name: string;
  email: string;
  message: string;
  userId: string | null;
}): Promise<{ code: string }> {
  const redaction = redactSensitive(input.message);
  const now = new Date();
  const conversation = await prisma.supportConversation.create({
    data: {
      userId: input.userId,
      guestName: input.userId ? null : input.name,
      guestEmail: input.userId ? null : input.email,
      status: "WAITING_AGENT",
      escalatedAt: now,
      lastMessageAt: now,
      escalationReason: "Formulario de contacto",
      summary: truncate(redaction.text, 400),
      messages: { create: { role: "USER", body: redaction.text, redacted: redaction.redacted } },
    },
    select: { id: true },
  });
  if (redaction.redacted) await logRedaction(conversation.id, redaction.kinds);

  const ticket = await createTicketForConversation(conversation.id, { source: "FORM", escalatedFromBot: false });
  return { code: ticket.code };
}

/** Registra QUE se ocultó un dato sensible (y de qué tipo), nunca el valor. */
export async function logRedaction(conversationId: string, kinds: string[]): Promise<void> {
  await logAdminAction({
    adminId: null,
    action: "support.message.redacted",
    targetType: "SUPPORT_CONVERSATION",
    targetId: conversationId,
    metadata: { kinds: kinds.join(",") },
  });
}
