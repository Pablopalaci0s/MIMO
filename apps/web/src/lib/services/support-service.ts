import { Prisma, prisma } from "@mimo/database";
import type {
  AdminSupportConversationDTO,
  AdminSupportConversationListItemDTO,
  SupportConversationDTO,
  SupportMessageDTO,
  SupportMessageMetadata,
} from "@mimo/types";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { buildEscalationSummary } from "@/lib/support/bot-rules";
import { logAdminAction } from "./admin-audit-service";
import { buildSupportEscalationEmail, buildSupportReplyEmail, sendEmail } from "./email-service";
import { createNotification } from "./notification-service";
import { generateBotReply, type BotHistoryMessage } from "./support-bot-service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "soporte@mimo.sv";

/** Tope de mensajes de la persona por conversación: frena abuso (cada uno
 * puede costar una llamada a la IA) y empuja a pasar con una persona. */
const MAX_USER_MESSAGES = 60;
/** Una conversación resuelta con soporte sigue visible un día, para poder calificarla. */
const RESOLVED_VISIBLE_MS = 24 * 60 * 60 * 1000;

const CONVERSATION_INCLUDE = {
  messages: {
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.SupportConversationInclude;

type ConversationRow = Prisma.SupportConversationGetPayload<{ include: typeof CONVERSATION_INCLUDE }>;
type MessageRow = ConversationRow["messages"][number];

// ───────────────────────────── mapeos ─────────────────────────────

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function toMessageDTO(message: MessageRow): SupportMessageDTO {
  return {
    id: message.id,
    role: message.role,
    // Solo el nombre de pila de quien atiende: no se expone el nombre completo del equipo.
    authorName: message.role === "AGENT" ? (message.sender ? firstName(message.sender.name) : "Equipo") : null,
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

// ───────────────────────── avisos al equipo ─────────────────────────

async function notifySupportTeam(conversationId: string): Promise<void> {
  try {
    const conversation = await prisma.supportConversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { user: { select: { name: true, email: true } } },
    });
    const customerName = conversation.user?.name ?? conversation.guestName ?? "Un visitante";
    const customerEmail = conversation.user?.email ?? conversation.guestEmail ?? null;
    const adminUrl = `${APP_URL}/admin/soporte/${conversation.id}`;

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          type: "SUPPORT_MESSAGE",
          title: `${customerName} pidió hablar con una persona`,
          body: truncate(conversation.summary ?? conversation.escalationReason ?? "Consulta de soporte", 140),
          linkHref: `/admin/soporte/${conversation.id}`,
        }).catch((error) => logger.error("No se pudo notificar a un admin", { error: String(error) })),
      ),
    );

    const email = buildSupportEscalationEmail({
      customerName,
      customerEmail,
      reason: conversation.escalationReason,
      summary: conversation.summary,
      adminUrl,
    });
    await sendEmail({ to: SUPPORT_EMAIL, ...email });
  } catch (error) {
    // Un aviso que falla nunca debe tumbarle el chat a quien lo pidió.
    logger.error("Falló el aviso de escalada de soporte", { conversationId, error: String(error) });
  }
}

async function notifyAssignedAdminOfUserMessage(conversation: ConversationRow, text: string): Promise<void> {
  try {
    const recipients = conversation.assignedToId
      ? [{ id: conversation.assignedToId }]
      : await prisma.user.findMany({ where: { role: "ADMIN", deletedAt: null }, select: { id: true } });
    const who = conversation.guestName ?? "El cliente";
    await Promise.all(
      recipients.map((admin) =>
        createNotification({
          userId: admin.id,
          type: "SUPPORT_MESSAGE",
          title: `${who} respondió en soporte`,
          body: truncate(text, 140),
          linkHref: `/admin/soporte/${conversation.id}`,
        }),
      ),
    );
  } catch (error) {
    logger.error("No se pudo avisar de un mensaje nuevo en soporte", { error: String(error) });
  }
}

// ───────────────────────────── escalada ─────────────────────────────

/**
 * Pasa la conversación de `BOT` a `WAITING_AGENT` y avisa al equipo. El
 * `updateMany` con `status: "BOT"` hace de candado: si dos caminos (el bot
 * y el botón "Hablar con una persona") escalan a la vez, solo uno avisa.
 * `announce` agrega el mensaje de confirmación — no hace falta cuando ya lo
 * escribió el bot en su respuesta.
 */
async function finalizeEscalation(conversationId: string, options: { announce: boolean }): Promise<void> {
  const now = new Date();
  const updated = await prisma.supportConversation.updateMany({
    where: { id: conversationId, status: "BOT" },
    data: { status: "WAITING_AGENT", escalatedAt: now, lastMessageAt: now },
  });
  if (updated.count === 0) return;

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
        body: `Listo, le pasé tu conversación a una persona del equipo de soporte, con un resumen para que no tengas que repetir nada. ${how}`,
      },
    });
  }
  await notifySupportTeam(conversationId);
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

export async function sendUserMessage(input: {
  conversationId?: string;
  userId: string | null;
  userName: string | null;
  text: string;
  pagePath?: string;
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
  // Una conversación terminada no se reabre escribiendo: arranca una nueva.
  if (conversation?.status === "RESOLVED") conversation = null;
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

  const conversationId = conversation.id;
  await prisma.supportMessage.create({ data: { conversationId, role: "USER", body: input.text } });
  await prisma.supportConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

  if (conversation.status === "BOT") {
    const history = [...conversation.messages.map(toHistory), { role: "USER" as const, body: input.text }];
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
        if (input.userId || fresh.guestEmail) await finalizeEscalation(conversationId, { announce: false });
      }
    }
  } else if (conversation.status === "WITH_AGENT") {
    await notifyAssignedAdminOfUserMessage(conversation, input.text);
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
    await prisma.supportMessage.create({
      data: { conversationId, role: "USER", body: input.reason ?? "Quiero hablar con una persona del equipo." },
    });
  }

  const reason = input.reason ?? conversation.escalationReason ?? "La persona pidió hablar con alguien del equipo";
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

  await finalizeEscalation(conversationId, { announce: true });
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

export async function rateConversation(input: {
  conversationId: string;
  userId: string | null;
  rating: number;
}): Promise<void> {
  const conversation = await findAccessibleConversation(input.conversationId, input.userId);
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status !== "RESOLVED" || conversation.escalatedAt === null) {
    throw new AppError("NOT_RATEABLE", "Solo se puede calificar una conversación que ya terminó con soporte.", 400);
  }
  if (conversation.rating !== null) throw new AppError("ALREADY_RATED", "Ya calificaste esta conversación.", 409);
  await prisma.supportConversation.update({ where: { id: conversation.id }, data: { rating: input.rating } });
}

// ───────────────────────── lado del equipo (admin) ─────────────────────────

export type AdminSupportFilter = "pending" | "resolved" | "bot" | "all";

const ADMIN_LIST_INCLUDE = {
  user: { select: { name: true, email: true } },
  assignedTo: { select: { name: true } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
} satisfies Prisma.SupportConversationInclude;

type AdminListRow = Prisma.SupportConversationGetPayload<{ include: typeof ADMIN_LIST_INCLUDE }>;

function toAdminListItem(row: AdminListRow): AdminSupportConversationListItemDTO {
  const last = row.messages[0];
  const lastMessageRole = last?.role ?? "BOT";
  return {
    id: row.id,
    status: row.status,
    customerName: row.user?.name ?? row.guestName ?? "Visitante",
    customerEmail: row.user?.email ?? row.guestEmail,
    isGuest: row.userId === null,
    summary: row.summary,
    lastMessagePreview: truncate(last?.body ?? "", 120),
    lastMessageRole,
    lastMessageAt: row.lastMessageAt.toISOString(),
    escalatedAt: row.escalatedAt?.toISOString() ?? null,
    assignedToName: row.assignedTo ? firstName(row.assignedTo.name) : null,
    rating: row.rating,
    needsReply: row.status === "WAITING_AGENT" || (row.status === "WITH_AGENT" && lastMessageRole === "USER"),
  };
}

export async function listAdminSupportConversations(
  filter: AdminSupportFilter = "pending",
): Promise<AdminSupportConversationListItemDTO[]> {
  const where: Prisma.SupportConversationWhereInput =
    filter === "pending"
      ? { status: { in: ["WAITING_AGENT", "WITH_AGENT"] } }
      : filter === "resolved"
        ? { status: "RESOLVED", escalatedAt: { not: null } }
        : filter === "bot"
          ? { status: { in: ["BOT", "RESOLVED"] }, escalatedAt: null, messages: { some: {} } }
          : { messages: { some: {} } };

  const rows = await prisma.supportConversation.findMany({
    where,
    include: ADMIN_LIST_INCLUDE,
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
  const items = rows.map(toAdminListItem);

  // Lo que espera respuesta primero, y lo más viejo primero (nadie se queda al fondo).
  const waiting = items.filter((item) => item.needsReply).sort((a, b) => a.lastMessageAt.localeCompare(b.lastMessageAt));
  return [...waiting, ...items.filter((item) => !item.needsReply)];
}

export async function countPendingSupportConversations(): Promise<number> {
  return prisma.supportConversation.count({ where: { status: "WAITING_AGENT" } });
}

export async function getAdminSupportConversation(id: string): Promise<AdminSupportConversationDTO> {
  const row = await prisma.supportConversation.findUnique({
    where: { id },
    include: {
      ...ADMIN_LIST_INCLUDE,
      messages: { include: { sender: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);

  const last = row.messages[row.messages.length - 1];
  const asListRow: AdminListRow = { ...row, messages: last ? [last] : [] };
  return {
    ...toAdminListItem(asListRow),
    escalationReason: row.escalationReason,
    messages: row.messages.map((message) =>
      toMessageDTO({ ...message, sender: message.sender } as MessageRow),
    ),
  };
}

export async function agentReply(conversationId: string, adminId: string, text: string): Promise<void> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status === "BOT") {
    throw new AppError("NOT_ESCALATED", "Esta conversación todavía la atiende el asistente: la persona no pidió hablar con el equipo.", 400);
  }
  if (conversation.status === "RESOLVED") {
    throw new AppError("RESOLVED", "La conversación está resuelta. Reabrila para responder.", 400);
  }

  const now = new Date();
  await prisma.supportMessage.create({
    data: { conversationId, role: "AGENT", body: text, senderId: adminId },
  });
  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: { status: "WITH_AGENT", assignedToId: adminId, lastMessageAt: now },
  });

  await logAdminAction({
    adminId,
    action: "support.reply",
    targetType: "SUPPORT_CONVERSATION",
    targetId: conversationId,
    // El contenido no se copia al registro de auditoría: ya vive en la conversación.
    metadata: { length: text.length },
  });

  try {
    if (conversation.user) {
      await createNotification({
        userId: conversation.user.id,
        type: "SUPPORT_MESSAGE",
        title: "El equipo de MIMO te respondió",
        body: truncate(text, 140),
        linkHref: "/soporte",
      });
    } else if (conversation.guestEmail) {
      const email = buildSupportReplyEmail({
        customerName: conversation.guestName ?? "",
        preview: truncate(text, 400),
        chatUrl: `${APP_URL}/soporte?c=${conversationId}`,
      });
      await sendEmail({ to: conversation.guestEmail, ...email });
    }
  } catch (error) {
    // La respuesta ya quedó guardada y visible en el chat; el aviso es un extra.
    logger.error("No se pudo avisar a la persona de la respuesta de soporte", { conversationId, error: String(error) });
  }
}

export async function resolveSupportConversation(conversationId: string, adminId: string): Promise<void> {
  const conversation = await prisma.supportConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status === "RESOLVED") return;

  const now = new Date();
  await prisma.supportMessage.create({
    data: {
      conversationId,
      role: "BOT",
      body: "El equipo de soporte marcó esta conversación como resuelta. Si todavía necesitás algo, escribinos de nuevo. ¿Cómo fue la atención?",
    },
  });
  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: { status: "RESOLVED", resolvedAt: now, lastMessageAt: now, assignedToId: conversation.assignedToId ?? adminId },
  });
  await logAdminAction({
    adminId,
    action: "support.resolve",
    targetType: "SUPPORT_CONVERSATION",
    targetId: conversationId,
  });
}

export async function reopenSupportConversation(conversationId: string, adminId: string): Promise<void> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { where: { role: "AGENT" }, take: 1 } },
  });
  if (!conversation) throw new AppError("NOT_FOUND", "No encontramos esa conversación.", 404);
  if (conversation.status !== "RESOLVED") return;
  if (conversation.escalatedAt === null) {
    throw new AppError("NOT_ESCALATED", "Esta conversación nunca pasó a soporte: no hay nada que reabrir.", 400);
  }

  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: {
      status: conversation.messages.length > 0 ? "WITH_AGENT" : "WAITING_AGENT",
      resolvedAt: null,
      rating: null,
      lastMessageAt: new Date(),
    },
  });
  await logAdminAction({
    adminId,
    action: "support.reopen",
    targetType: "SUPPORT_CONVERSATION",
    targetId: conversationId,
  });
}
