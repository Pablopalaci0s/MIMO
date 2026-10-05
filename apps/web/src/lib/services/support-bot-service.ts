import { AIRefusalError, AIService, type ConverseTurn } from "@mimo/ai";
import type { SupportMessageMetadata, SupportMessageRole } from "@mimo/types";
import { logger } from "@/lib/logger";
import { buildContextBlock, SUPPORT_SYSTEM_PROMPT, type BotContext } from "@/lib/support/bot-prompt";
import {
  HELP_MATCH_CONFIDENT_SCORE,
  buildEscalationSummary,
  detectHumanRequest,
  detectSensitiveTopic,
  extractOrderNumber,
  extractProductQuery,
  isGreeting,
  isOrderStatusIntent,
  isThanks,
  matchHelpItems,
} from "@/lib/support/bot-rules";
import { createToolRunner, toOrderCard, type ToolContext } from "@/lib/support/bot-tools";
import { ORDER_STATUS_LABEL } from "@/lib/support/labels";
import { listCategories } from "./catalog-service";
import { getOrderByNumber, listMyOrders } from "./order-service";

const ai = new AIService();

const MAX_HISTORY_TURNS = 20;
const MAX_REPLY_CHARS = 1500;

export interface BotHistoryMessage {
  role: SupportMessageRole;
  body: string;
  unresolved?: boolean;
}

export interface BotReplyInput {
  userId: string | null;
  userName: string | null;
  pagePath?: string;
  /** Historial completo, ya con el mensaje nuevo de la persona al final. */
  history: BotHistoryMessage[];
}

export interface BotReply {
  text: string;
  metadata: SupportMessageMetadata | null;
  /** Si viene, el bot pide pasar la conversación a una persona. */
  escalation: { reason: string; summary: string } | null;
  usedAI: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "¿Cómo hago un pedido?",
  "¿Qué métodos de pago aceptan?",
  "¿Cuánto cuesta el envío?",
];

function lastUserMessage(history: BotHistoryMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.role === "USER") return history[i]!.body;
  }
  return "";
}

/** El chat es texto plano: si el modelo igual manda markdown, se limpia. */
function cleanReply(text: string): string {
  const cleaned = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= MAX_REPLY_CHARS) return cleaned;
  const cut = cleaned.slice(0, MAX_REPLY_CHARS);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return `${lastStop > MAX_REPLY_CHARS * 0.6 ? cut.slice(0, lastStop + 1) : cut}…`;
}

function toTurns(history: BotHistoryMessage[]): ConverseTurn[] {
  const turns = history.slice(-MAX_HISTORY_TURNS).map<ConverseTurn>((message) => ({
    role: message.role === "USER" ? "user" : "assistant",
    content: message.body,
  }));
  // La API exige que arranque con un turno de la persona.
  while (turns.length > 0 && turns[0]!.role !== "user") turns.shift();
  return turns;
}

function nonEmpty(metadata: SupportMessageMetadata): SupportMessageMetadata | null {
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function humanHandoffReply(input: BotReplyInput, reason: string): BotReply {
  const lead = "Claro, te paso con una persona del equipo de soporte.";
  const text = input.userId
    ? `${lead} Ya va a tener esta conversación y un resumen, así que no hace falta que repitas nada. Te responde acá mismo.`
    : `${lead} Para poder responderte, dejame tu nombre y tu correo acá abajo.`;
  return {
    text,
    metadata: input.userId ? null : { requestContact: true },
    escalation: { reason, summary: buildEscalationSummary(input.history) },
    usedAI: false,
  };
}

async function loadCategories() {
  try {
    const categories = await listCategories();
    return categories.map((category) => ({ slug: category.slug, name: category.name }));
  } catch {
    return [];
  }
}

async function replyWithAI(input: BotReplyInput, categories: BotContext["categories"]): Promise<BotReply> {
  const toolContext: ToolContext = {
    userId: input.userId,
    categorySlugs: new Set(categories.map((category) => category.slug)),
  };
  const runner = createToolRunner(toolContext);

  const turns = toTurns(input.history);
  if (turns.length === 0) throw new Error("Sin mensajes para responder");

  const { text } = await ai.converse({
    system: SUPPORT_SYSTEM_PROMPT,
    context: buildContextBlock({
      userName: input.userName,
      isLoggedIn: input.userId !== null,
      pagePath: input.pagePath,
      categories,
    }),
    messages: turns,
    tools: runner.tools,
    executeTool: runner.execute,
  });

  const { products, order, escalation } = runner.outcome;
  const metadata: SupportMessageMetadata = {};
  if (products.length > 0) metadata.products = products.slice(0, 4);
  if (order) metadata.order = order;
  if (escalation && !input.userId) metadata.requestContact = true;

  return { text: cleanReply(text), metadata: nonEmpty(metadata), escalation, usedAI: true };
}

/** Motor de respaldo: sin IA, o si la IA falló/rechazó — el chat sigue vivo. */
async function replyWithRules(input: BotReplyInput, categories: BotContext["categories"]): Promise<BotReply> {
  const text = lastUserMessage(input.history);
  const done = (reply: Omit<BotReply, "usedAI">): BotReply => ({ ...reply, usedAI: false });

  if (isGreeting(text)) {
    return done({
      text: "¡Hola! Soy el asistente virtual de MIMO. Puedo ayudarte con pedidos, pagos, entregas, tu cuenta y a encontrar regalos. ¿Qué necesitás?",
      metadata: { suggestions: DEFAULT_SUGGESTIONS },
      escalation: null,
    });
  }
  if (isThanks(text)) {
    return done({
      text: "¡Con gusto! Si necesitás algo más, acá estoy.",
      metadata: null,
      escalation: null,
    });
  }

  if (detectSensitiveTopic(text)) {
    const reason = "Tema sensible (pagos, reclamo o seguridad)";
    return done({
      text: input.userId
        ? "Entiendo, y esto lo tiene que ver una persona del equipo — yo no puedo resolverlo por acá. Te paso ahora mismo; ya va a tener tu conversación, así que no hace falta que repitas nada."
        : "Entiendo, y esto lo tiene que ver una persona del equipo — yo no puedo resolverlo por acá. Dejame tu nombre y tu correo acá abajo para que puedan responderte.",
      metadata: input.userId ? null : { requestContact: true },
      escalation: { reason, summary: buildEscalationSummary(input.history) },
    });
  }

  const orderNumber = extractOrderNumber(text);
  if (orderNumber || isOrderStatusIntent(text)) {
    if (!input.userId) {
      return done({
        text: "Para consultar un pedido necesito que inicies sesión en /iniciar-sesion. Cuando entres, escribime de nuevo y te digo cómo va.",
        metadata: null,
        escalation: null,
      });
    }

    if (orderNumber) {
      const order = await getOrderByNumber(orderNumber, input.userId);
      if (!order) {
        return done({
          text: `No encontré el pedido ${orderNumber} en tu cuenta. Revisá que el número esté bien (se ve así: MIMO-20260912-AB12C) o, si preferís, te paso con una persona.`,
          metadata: null,
          escalation: null,
        });
      }
      const lines = order.items.map(
        (item) => `${item.quantity} × ${item.productName} (${item.businessName}): ${ORDER_STATUS_LABEL[item.status]}`,
      );
      return done({
        text: `Tu pedido ${order.orderNumber} está ${ORDER_STATUS_LABEL[order.status].toLowerCase()}.\n${lines.join("\n")}\nPodés ver el detalle en /pedidos/${order.orderNumber}.`,
        metadata: { order: toOrderCard(order) },
        escalation: null,
      });
    }

    const orders = (await listMyOrders(input.userId)).slice(0, 3);
    if (orders.length === 0) {
      return done({
        text: "Todavía no tenés pedidos en tu cuenta. Cuando hagas uno, lo vas a ver en /mis-pedidos con su estado.",
        metadata: null,
        escalation: null,
      });
    }
    const lines = orders.map((order) => `${order.orderNumber}: ${ORDER_STATUS_LABEL[order.status]}`);
    return done({
      text: `Estos son tus últimos pedidos:\n${lines.join("\n")}\nPodés ver todos en /mis-pedidos. Si querés el detalle de uno, escribime su número.`,
      metadata: orders.length === 1 ? { order: toOrderCard(orders[0]!) } : null,
      escalation: null,
    });
  }

  const matches = matchHelpItems(text);
  const best = matches[0];
  if (best && best.score >= HELP_MATCH_CONFIDENT_SCORE) {
    const related = matches.slice(1).filter((match) => match.score >= 2).map((match) => match.item.question);
    return done({
      text: best.item.answer,
      metadata: related.length > 0 ? { suggestions: related.slice(0, 2) } : null,
      escalation: null,
    });
  }

  const query = extractProductQuery(text);
  if (query) {
    const runner = createToolRunner({
      userId: input.userId,
      categorySlugs: new Set(categories.map((category) => category.slug)),
    });
    await runner.execute("search_products", { query });
    if (runner.outcome.products.length > 0) {
      return done({
        text: "Esto es lo que encontré en el catálogo. Si querés que te ayude a elegir un regalo desde cero, probá /ayudame-a-elegir.",
        metadata: { products: runner.outcome.products },
        escalation: null,
      });
    }
  }

  // No hay coincidencia: la primera vez se pide reformular; la segunda
  // seguida, en vez de hacer dar vueltas a la persona, se pasa a un humano.
  const previousBot = [...input.history].reverse().find((message) => message.role === "BOT");
  if (previousBot?.unresolved) {
    const reason = "El asistente no pudo resolver la consulta";
    return done({
      text: input.userId
        ? "No logro ayudarte con esto por acá, así que te paso con una persona del equipo. Ya va a tener la conversación, no hace falta que repitas nada."
        : "No logro ayudarte con esto por acá, así que te paso con una persona del equipo. Dejame tu nombre y tu correo acá abajo para que puedan responderte.",
      metadata: input.userId ? null : { requestContact: true },
      escalation: { reason, summary: buildEscalationSummary(input.history) },
    });
  }

  const suggestions = matches.length > 0 ? matches.map((match) => match.item.question) : DEFAULT_SUGGESTIONS;
  return done({
    text: "No estoy seguro de haber entendido tu consulta. ¿Podés contármela de otra forma? También podés elegir una de estas preguntas, o pedirme que te pase con una persona.",
    metadata: { suggestions: suggestions.slice(0, 3), unresolved: true },
    escalation: null,
  });
}

/**
 * Único punto de entrada del asistente. Orden: (1) barandas deterministas
 * que no dependen de la IA, (2) IA con herramientas, (3) motor de reglas
 * si no hay IA o falló — nunca se le deja a la persona un chat mudo.
 */
export async function generateBotReply(input: BotReplyInput): Promise<BotReply> {
  const text = lastUserMessage(input.history);

  // Quien pide una persona no tiene que discutir con un bot.
  if (detectHumanRequest(text)) return humanHandoffReply(input, "La persona pidió hablar con alguien del equipo");

  const categories = await loadCategories();

  if (ai.isAIAvailable) {
    try {
      return await replyWithAI(input, categories);
    } catch (error) {
      if (error instanceof AIRefusalError) {
        logger.warn("El proveedor de IA rechazó un mensaje del chat de soporte, se usa el motor de reglas");
      } else {
        logger.error("Falló la IA del chat de soporte, se usa el motor de reglas", {
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        });
      }
    }
  }

  return replyWithRules(input, categories);
}
