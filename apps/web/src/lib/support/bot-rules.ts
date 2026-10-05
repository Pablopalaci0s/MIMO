import { HELP_GROUPS, type HelpGroup, type HelpItem } from "./help-content";

/**
 * Reglas deterministas del asistente. Dos usos distintos y a propósito
 * separados de la IA:
 *  1. Barandas que valen con o sin IA — si alguien pide una persona, no se
 *     lo hace discutir con un bot.
 *  2. El motor de respaldo cuando no hay ANTHROPIC_API_KEY (o la IA falla):
 *     el chat sigue sirviendo, con respuestas de la base de conocimiento.
 *
 * Todo acá es función pura (sin base de datos) para poder testearla.
 */

/** minúsculas, sin tildes ni signos — para comparar lo que escribe la gente. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Formato real generado en order-service.ts: MIMO-YYYYMMDD-XXXXX
const ORDER_NUMBER_REGEX = /\bMIMO-\d{8}-[A-Z0-9]{5}\b/i;

export function extractOrderNumber(text: string): string | null {
  const match = text.match(ORDER_NUMBER_REGEX);
  return match ? match[0].toUpperCase() : null;
}

const HUMAN_REQUEST_PATTERNS: RegExp[] = [
  /\b(hablar|comunicar\w*|contactar\w*|chatear|conversar)\b.{0,25}\b(persona|humano|humana|agente|asesor|asesora|alguien|soporte|operador|operadora|representante|encargado|encargada)\b/,
  /\b(quiero|necesito|prefiero|pasame|pasenme|comunicame|comuniquenme|ponme|pongame|ponganme)\b.{0,25}\b(humano|humana|agente|asesor|asesora|operador|operadora|soporte)\b/,
  /\b(persona real|persona de verdad|atencion humana|atencion al cliente|servicio al cliente)\b/,
  /\bno quiero (hablar con )?(un )?(bot|robot|asistente virtual)\b/,
  /^(agente|asesor|asesora|humano|humana|soporte|operador|operadora)$/,
];

export function detectHumanRequest(text: string): boolean {
  const normalized = normalizeText(text);
  return HUMAN_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /reembols/,
  /(devuelv\w*|devol\w*) (mi |el |la |me )?(dinero|plata|pago)/,
  /(me )?cobr\w+ (doble|dos veces|de mas|demas|sin)/,
  /cargo (no autorizado|duplicado|indebido)/,
  /\b(estafa|estafaron|estafado|fraude|robo|robaron|contracargo|denuncia|denunciar|demanda|demandar|abogado)\b/,
  /\b(no me llego|nunca llego|no llego|no ha llegado)\b.*\b(pedido|regalo|orden)\b/,
  /\b(pedido|regalo|orden)\b.*\b(no me llego|nunca llego|no llego|no ha llegado)\b/,
  /\b(acoso|amenaza|amenazas|insulto|insultos)\b/,
];

/** Plata, fraude o seguridad: nada de esto lo resuelve un bot. */
export function detectSensitiveTopic(text: string): boolean {
  const normalized = normalizeText(text);
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "a", "en", "que", "por", "para", "con",
  "mi", "me", "mis", "tu", "su", "se", "es", "al", "del", "lo", "le", "como", "cual", "cuales", "donde", "cuando",
  "hay", "puedo", "quiero", "necesito", "tengo", "tienen", "pueden", "si", "no", "ya", "muy", "mas", "esto", "esta",
  "hola", "buenas", "buenos", "dias", "tardes", "noches", "gracias", "favor", "porfa", "ayuda", "ayudame", "pregunta",
]);

function significantTokens(normalized: string): string[] {
  return normalized.split(" ").filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export interface HelpMatch {
  item: HelpItem;
  score: number;
}

/**
 * Qué tan bien calza un mensaje con cada pregunta frecuente: las frases
 * clave pesan mucho (3+), las palabras sueltas de la pregunta poco (1). Un
 * puntaje menor a 3 no alcanza para afirmar "esto es lo que preguntás".
 */
export function matchHelpItems(text: string, groups: HelpGroup[] = HELP_GROUPS, limit = 3): HelpMatch[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const padded = ` ${normalized} `;
  const tokens = new Set(significantTokens(normalized));

  const matches: HelpMatch[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      let score = 0;
      for (const keyword of item.keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword) continue;
        if (padded.includes(` ${normalizedKeyword} `) || padded.includes(` ${normalizedKeyword}`)) {
          score += 2 + normalizedKeyword.split(" ").length;
        }
      }
      for (const token of significantTokens(normalizeText(item.question))) {
        if (tokens.has(token)) score += 1;
      }
      if (score > 0) matches.push({ item, score });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const HELP_MATCH_CONFIDENT_SCORE = 3;

/** Palabras clave para buscar productos a partir de una frase libre. */
export function extractProductQuery(text: string): string {
  const intentWords = new Set([
    "busco", "buscando", "buscar", "quiero", "tienen", "hay", "necesito", "recomiendan", "recomienda",
    "recomendame", "regalo", "regalar", "comprar", "venden", "vende", "algo", "mostrame", "muestrame",
  ]);
  return significantTokens(normalizeText(text))
    .filter((token) => !intentWords.has(token))
    .slice(0, 3)
    .join(" ");
}

const MAX_SUMMARY_MESSAGE_CHARS = 160;

/** Resumen sin IA para quien atiende: lo último que dijo la persona. El
 * motivo se guarda y se muestra aparte (`escalationReason`), no se repite acá. */
export function buildEscalationSummary(history: { role: "USER" | "BOT" | "AGENT"; body: string }[]): string {
  const userMessages = history
    .filter((message) => message.role === "USER")
    .slice(-3)
    .map((message) => {
      const clean = message.body.replace(/\s+/g, " ").trim();
      return clean.length > MAX_SUMMARY_MESSAGE_CHARS ? `${clean.slice(0, MAX_SUMMARY_MESSAGE_CHARS)}…` : clean;
    });

  if (userMessages.length === 0) return "La persona pidió hablar con alguien del equipo.";
  return `Últimos mensajes de la persona: ${userMessages.map((message) => `"${message}"`).join(" · ")}`;
}

const GREETING_PATTERN =
  /^(hola+|holi+|buenas+|buenos dias|buen dia|buenas tardes|buenas noches|hey+|que tal|saludos)( .{0,20})?$/;
const THANKS_PATTERN = /^(muchas |mil )?(gracias|grax|listo gracias|ok gracias|perfecto gracias|genial gracias)( .{0,20})?$/;

export function isGreeting(text: string): boolean {
  return GREETING_PATTERN.test(normalizeText(text));
}

export function isThanks(text: string): boolean {
  return THANKS_PATTERN.test(normalizeText(text));
}

const ORDER_STATUS_PATTERNS: RegExp[] = [
  /\b(estado|seguimiento|rastreo|rastrear)\b.{0,20}\b(pedido|orden|compra)\b/,
  /\bdonde (esta|va|anda) (mi|el) (pedido|regalo|orden|compra)\b/,
  /\b(mi|mis) (pedidos?|ordenes|compras)\b/,
  /\bcuando (llega|llegara) (mi|el) (pedido|regalo|orden|compra)\b/,
];

/** La persona quiere saber cómo va su pedido (sin necesariamente dar el número). */
export function isOrderStatusIntent(text: string): boolean {
  const normalized = normalizeText(text);
  return ORDER_STATUS_PATTERNS.some((pattern) => pattern.test(normalized));
}
