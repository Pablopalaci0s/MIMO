import { Prisma, prisma } from "@mimo/database";
import type {
  SupportConversationDTO,
  SupportMessageDTO,
  SupportMessageMetadata,
  SupportTicketSource,
} from "@mimo/types";
import { redactSensitive } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { buildEscalationSummary } from "@/lib/support/bot-rules";
import { ticketCode } from "@/lib/support/ticket-rules";
import { logAdminAction } from "./admin-audit-service";
import { generateBotReply, type BotHistoryMessage } from "./support-bot-service";
import {
  createTicketForConversation,
  logRedaction,
  registerCustomerMessage,
} from "./support-ticket-intake-service";

/**
 * Lado CLIENTE del soporte: el chat con el asistente, el pedido de hablar con
 * una persona, y la calificación. Cuando la conversación pasa a una persona
 * nace un ticket (ver `support-ticket-intake-service.ts`); todo lo que hace el
 * equipo vive en `support-ticket-service.ts`.
 *
 * El cliente SOLO ve mensajes PÚBLICOS: las notas internas del equipo quedan
 * fuera desde la consulta (`CONVERSATION_INCLUDE`), así que ni la pantalla del
 * cliente ni el historial que se le manda al asistente las pueden recibir.
 */

/** Tope de mensajes de la persona por conversación: frena abuso (cada uno
 * puede costar una llamada a la IA) y empuja a pasar con una persona. */
const MAX_USER_MESSAGES = 60;
/** Una conversación resuelta con soporte sigue visible un día, para poder calificarla o reabrirla respondiendo. */
const RESOLVED_VISIBLE_MS = 24 * 60 * 60 * 1000;

const SENSITIVE_NOTICE =
  "Por tu seguridad ocultamos un dato sensible (un número de documento o de tarjeta) de tu mensaje. Recordá no compartir contraseñas, códigos de seguridad ni documentos de identidad por este chat.";

const CONVERSATION_INCLUDE = {
  messages: {
    // Única puerta de salida de mensajes hacia el cliente y el asistente: solo los públicos.
    where: { visibility: "PUBLIC" as const },
    include: { sender: { select: { name: true, supportUsername: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  ticket: { select: { id: true, number: true, status: true, assignedAgentId: true } },
} satisfies Prisma.SupportConversationInclude;

type ConversationRow = Prisma.SupportConversationGetPayload<{ include: typeof CONVERSATION_INCLUDE }>;
type MessageRow = ConversationRow["messages"][number];

// ───────────────────────────── mapeos ─────────────────────────────

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function toMessageDTO(message: MessageRow): SupportMessageDTO {
  return {
    id: message.id,
    role: message.role,
    // El nombre de usuario que la persona eligió; si todavía no tiene uno, solo su nombre de
    // pila (nunca el nombre completo del equipo).
    authorName: message.role === "AGENT" ? (message.sender ? (message.sender.supportUsername ?? firstName(message.sender.name)) : "Equipo") : null,
    body: message.body,
    metadata: (message.metadata as SupportMessageMetadata | null) ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

function toConversationDTO(conversation: ConversationRow): SupportConversationDTO {
  return {
    id: conversation.id,
    status: conversation.status,
    messages: conversation.messages.map(toMessageDTO),
    canRate: conversation.status === "RESOLVED" && conversation.escalatedAt !== null && conversation.rating === null,
    rating: conversation.rating,
    ticketCode: conversation.ticket ? ticketCode(conversation.ticket.number) : null,
  };
}

function toHistory(message: MessageRow): BotHistoryMessage {
  const metadata = message.metadata as SupportMessageMetadata | null;
  return { role: message.role, body: message.body, unresolved: metadata?.unresolved === true };
}

function asJson(metadata: SupportMessageMetadata | null | undefined) {
  return metadata ? (metadata as unknown as Prisma.InputJsonValue) : undefined;
}

// ─────────────────────────── acceso y carga ───────────────────────────

/**
 * Un visitante sin cuenta se identifica solo por el id (uuid v4, no
 * adivinable) que guarda su navegador; una conversación de una cuenta, en
 * cambio, exige que quien pregunta sea esa cuenta — aunque conozca el id.
 * Si no corresponde, es como si no existiera (404, no 403: no se confirma
 * que el id existe).
 */
async function findAccessibleConversation(id: string, userId: string | null): Promise<ConversationRow | null> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id },
    include: CONVERSATION_INCLUDE,
  });
  if (!conversation) return null;
  if (conversation.userId && conversation.userId !== userId) return null;
  return conversation;
}

function isVisibleToUser(conversation: ConversationRow): boolean {
  if (conversation.status !== "RESOLVED") return true;
  return (
    conversation.escalatedAt !== null &&
    conversation.rating === null &&
    conversation.resolvedAt !== null &&
    Date.now() - conversation.resolvedAt.getTime() < RESOLVED_VISIBLE_MS
  );
}

/** Una conversación RESUELTA por soporte que el cliente todavía ve: si responde, el ticket se reabre en vez de empezar otra. */
function isReopenableByCustomer(conversation: ConversationRow): boolean {
  return conversation.status === "RESOLVED" && conversation.ticket?.status === "RESOLVED" && isVisibleToUser(conversation);
}

export async function getConversation(input: {
  conversationId?: string;
  userId: string | null;
}): Promise<SupportConversationDTO | null> {
  if (input.conversationId) {
    const conversation = await findAccessibleConversation(input.conversationId, input.userId);
    if (conversation && isVisibleToUser(conversation)) return toConversationDTO(conversation);
  }

  // Con cuenta, la conversación sigue entre dispositivos aunque el
  // navegador no tenga guardado el id.
  if (input.userId) {
    const latest = await prisma.supportConversation.findFirst({
      where: { userId: input.userId },
      orderBy: { lastMessageAt: "desc" },
      include: CONVERSATION_INCLUDE,
    });
    if (latest && isVisibleToUser(latest)) return toConversationDTO(latest);
  }
  return null;
}

async function loadDTO(id: string): Promise<SupportConversationDTO> {
  const conversation = await prisma.supportConversation.findUniqueOrThrow({
    where: { id },
    include: CONVERSATION_INCLUDE,
  });
  return toConversationDTO(conversation);
}

// ───────────────────────────── escalada ─────────────────────────────

/**
 * Pasa la conversación de `BOT` a `WAITING_AGENT`, abre el ticket y avisa al
 * equipo. El `updateMany` con `status: "BOT"` hace de candado: si dos caminos
 * (el bot y el botón "Hablar con una persona") escalan a la vez, solo uno crea
 * el ticket. `announce` agrega el mensaje de confirmación — no hace falta
 * cuando ya lo escribió el bot en su respuesta.
 */
async function finalizeEscalation(
  conversationId: string,
  options: { announce: boolean; source: SupportTicketSource; escalatedFromBot: boolean; categorySlug?: string | null },
): Promise<void> {
  const now = new Date();
  const updated = await prisma.supportConversation.updateMany({
    where: { id: conversationId, status: "BOT" },
    data: { status: "WAITING_AGENT", escalatedAt: now, lastMessageAt: now },
  });
  if (updated.count === 0) return;

  let code: string | null = null;
  try {
    const ticket = await createTicketForConversation(conversationId, {
      source: options.source,
      escalatedFromBot: options.escalatedFromBot,
      categorySlug: options.categorySlug,
    });
    code = ticket.code;
  } catch (error) {
    // La conversación ya está escalada: si el ticket falla, la red de seguridad de la bandeja lo crea después.
    logger.error("No se pudo crear el ticket al escalar", { conversationId, error: String(error) });
  }

  if (options.announce) {
    const conversation = await prisma.supportConversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { userId: true, guestEmail: true },
    });
    const how = conversation.userId
      ? "Te responde en este mismo chat y te va a llegar una notificación."
      : `Te responde en este mismo chat y te avisamos por correo a ${conversation.guestEmail ?? "tu correo"}.`;
    await prisma.supportMessage.create({
      data: {
        conversationId,
        role: "BOT",
        body: `Listo, le pasé tu conversación a una persona del equipo de soporte${code ? ` (ticket ${code})` : ""}, con un resumen para que no tengas que repetir nada. ${how}`,
      },
    });
  }
}

/**
 * Un visitante chatea, el bot le pide iniciar sesión para ver sus pedidos, y
 * vuelve ya logueado a la MISMA conversación (el navegador guardó su id):
 * al escribir, esa conversación pasa a ser de su cuenta — así, si después pide
 * una persona, el aviso de la respuesta le llega a su cuenta y no se pierde.
 * Solo si todavía la atiende el bot: una que ya está con soporte tiene un
 * correo de visitante con el que se le responde, y no se le cambia el dueño.
 * El `userId: null` en el where evita pisar una que otra cuenta reclamó antes.
 */
async function claimGuestConversation(conversation: ConversationRow, userId: string | null): Promise<void> {
  if (!userId || conversation.userId !== null || conversation.status !== "BOT") return;
  await prisma.supportConversation.updateMany({
    where: { id: conversation.id, userId: null, status: "BOT" },
    data: { userId },
  });
}

/** La conversación sobre la que escribe esta persona (la del id, o la última de su cuenta), o ninguna si hay que empezar otra. */
async function resolveConversationForWriting(input: {
  conversationId?: string;
  userId: string | null;
}): Promise<ConversationRow | null> {
  let conversation = input.conversationId ? await findAccessibleConversation(input.conversationId, input.userId) : null;

  if (!conversation && input.userId) {
    conversation = await prisma.supportConversation.findFirst({
      where: { userId: input.userId },
      orderBy: { lastMessageAt: "desc" },
      include: CONVERSATION_INCLUDE,
    });
  }
  // Una conversación terminada no se reabre escribiendo — salvo un ticket resuelto que el cliente todavía ve.
  if (conversation?.status === "RESOLVED" && !isReopenableByCustomer(conversation)) return null;
  return conversation;
}

export async function sendUserMessage(input: {
  conversationId?: string;
  userId: string | null;
  userName: string | null;
  text: string;
  pagePath?: string;
}): Promise<SupportConversationDTO> {
  let conversation = await resolveConversationForWriting(input);
  if (!conversation) {
    conversation = await prisma.supportConversation.create({
      data: { userId: input.userId },
      include: CONVERSATION_INCLUDE,
    });
  }

  await claimGuestConversation(conversation, input.userId);

  const userMessageCount = conversation.messages.filter((message) => message.role === "USER").length;
  if (userMessageCount >= MAX_USER_MESSAGES) {
    throw new AppError(
      "CONVERSATION_TOO_LONG",
      "Esta conversación ya es muy larga. Pedí hablar con una persona del equipo o empezá una nueva.",
      400,
    );
  }

  // Datos sensibles (un DUI válido, una tarjeta) se ocultan ANTES de guardar y de
  // mandárselos al asistente: el valor original no se persiste ni se registra en ningún lado.
  const redaction = redactSensitive(input.text);
  const text = redaction.text;

  const conversationId = conversation.id;
  await prisma.supportMessage.create({
    data: { conversationId, role: "USER", body: text, redacted: redaction.redacted },
  });
  await prisma.supportConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
  if (redaction.redacted) {
    await logRedaction(conversationId, redaction.kinds);
    await prisma.supportMessage.create({ data: { conversationId, role: "BOT", body: SENSITIVE_NOTICE } });
  }

  if (conversation.ticket) {
    // Ya la atiende una persona (o está resuelta): estado, avisos y reapertura automática.
    await registerCustomerMessage(conversationId, text);
  } else if (conversation.status === "BOT") {
    const history = [...conversation.messages.map(toHistory), { role: "USER" as const, body: text }];
    const reply = await generateBotReply({
      userId: input.userId,
      userName: input.userName,
      pagePath: input.pagePath,
      history,
    });

    // La IA puede tardar segundos: si mientras tanto la persona ya pidió
    // hablar con alguien, la respuesta del bot llegaría tarde y fuera de lugar.
    const fresh = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { status: true, guestEmail: true },
    });
    if (fresh?.status === "BOT") {
      await prisma.supportMessage.create({
        data: { conversationId, role: "BOT", body: reply.text, metadata: asJson(reply.metadata) },
      });
      await prisma.supportConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

      if (reply.escalation) {
        await prisma.supportConversation.update({
          where: { id: conversationId },
          data: { summary: reply.escalation.summary, escalationReason: reply.escalation.reason },
        });
        // Un visitante sin correo todavía no se puede derivar: la pantalla
        // le pide el contacto y recién ahí (requestHuman) se avisa al equipo.
        if (input.userId || fresh.guestEmail) {
          await finalizeEscalation(conversationId, {
            announce: false,
            source: "CHATBOT",
            escalatedFromBot: true,
            categorySlug: reply.escalation.category,
          });
        }
      }
    }
  }

  return loadDTO(conversationId);
}

export async function requestHuman(input: {
  conversationId?: string;
  userId: string | null;
  reason?: string;
  guestName?: string;
  guestEmail?: string;
}): Promise<SupportConversationDTO> {
  let conversation = input.conversationId
    ? await findAccessibleConversation(input.conversationId, input.userId)
    : null;
  if (!conversation && input.userId) {
    conversation = await prisma.supportConversation.findFirst({
      where: { userId: input.userId, status: { not: "RESOLVED" } },
      orderBy: { lastMessageAt: "desc" },
      include: CONVERSATION_INCLUDE,
    });
  }
  if (conversation?.status === "RESOLVED") conversation = null;

  // Ya está con una persona: pedirlo de nuevo no hace nada (idempotente).
  if (conversation && conversation.status !== "BOT") return toConversationDTO(conversation);

  const needsContact = !input.userId && !(conversation?.guestEmail ?? input.guestEmail);
  const guestName = conversation?.guestName ?? input.guestName;
  if (!input.userId && (needsContact || !guestName)) {
    throw new AppError("CONTACT_REQUIRED", "Dejanos tu nombre y tu correo para poder responderte.", 400);
  }

  if (!conversation) {
    conversation = await prisma.supportConversation.create({
      data: { userId: input.userId },
      include: CONVERSATION_INCLUDE,
    });
  }
  const conversationId = conversation.id;
  await claimGuestConversation(conversation, input.userId);

  if (conversation.messages.length === 0) {
    const reason = redactSensitive(input.reason ?? "Quiero hablar con una persona del equipo.");
    await prisma.supportMessage.create({
      data: { conversationId, role: "USER", body: reason.text, redacted: reason.redacted },
    });
    if (reason.redacted) await logRedaction(conversationId, reason.kinds);
  }

  const reason = redactSensitive(input.reason ?? conversation.escalationReason ?? "La persona pidió hablar con alguien del equipo").text;
  const history = conversation.messages.map(toHistory);
  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: {
      escalationReason: reason,
      summary: conversation.summary ?? buildEscalationSummary(history),
      ...(input.userId
        ? {}
        : {
            guestName: input.guestName ?? conversation.guestName,
            guestEmail: input.guestEmail ?? conversation.guestEmail,
          }),
    },
  });

  // La persona lo pidió con el botón: no es el asistente quien decidió pasar a soporte.
  await finalizeEscalation(conversationId, { announce: true, source: "CUSTOMER_REQUEST", escalatedFromBot: false });
  return loadDTO(conversationId);
}

export async function closeBotConversation(input: { conversationId: string; userId: string | null }): Promise<void> {
  const conversation = await findAccessibleConversation(input.conversationId, input.userId);
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status !== "BOT") {
    throw new AppError(
      "CONVERSATION_WITH_SUPPORT",
      "Esta conversación está con el equipo de soporte: no se puede cerrar desde acá.",
      400,
    );
  }
  await prisma.supportConversation.update({
    where: { id: conversation.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
}

/**
 * Calificación (CSAT) de la atención: 1–5 y un comentario opcional, UNA sola
 * vez por conversación/ticket (el `updateMany ... rating: null` hace de
 * candado, así dos envíos simultáneos no se pisan).
 */
export async function rateConversation(input: {
  conversationId: string;
  userId: string | null;
  rating: number;
  comment?: string;
}): Promise<void> {
  const conversation = await findAccessibleConversation(input.conversationId, input.userId);
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status !== "RESOLVED" || conversation.escalatedAt === null) {
    throw new AppError("NOT_RATEABLE", "Solo se puede calificar una conversación que ya terminó con soporte.", 400);
  }
  if (conversation.rating !== null) throw new AppError("ALREADY_RATED", "Ya calificaste esta conversación.", 409);

  const comment = input.comment ? redactSensitive(input.comment).text : null;
  const result = await prisma.supportConversation.updateMany({
    where: { id: conversation.id, rating: null },
    data: { rating: input.rating, ratingComment: comment || null, ratedAt: new Date() },
  });
  if (result.count === 0) throw new AppError("ALREADY_RATED", "Ya calificaste esta conversación.", 409);

  if (conversation.ticket) {
    await logAdminAction({
      adminId: null,
      action: "ticket.rated",
      targetType: "SUPPORT_TICKET",
      targetId: conversation.ticket.id,
      metadata: { rating: input.rating, length: comment?.length ?? 0 },
    });
  }
}
