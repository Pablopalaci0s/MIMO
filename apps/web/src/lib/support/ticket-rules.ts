import type { SupportTicketPermissionsDTO, SupportTicketStatus, SupportTicketView } from "@mimo/types";
import { normalizeText } from "./bot-rules";

/**
 * Reglas PURAS del centro de soporte (sin base de datos ni React): estados,
 * quién puede hacer qué sobre un ticket y cómo se clasifica la categoría. Los
 * servicios las aplican en el servidor; la interfaz solo las usa para esconder
 * botones (nunca como control de acceso).
 */

export type StaffRole = "SUPPORT_AGENT" | "SUPPORT_MANAGER" | "ADMIN";

export interface StaffActor {
  id: string;
  role: StaffRole;
}

/** Supervisores y administradores. */
export function isManager(actor: StaffActor): boolean {
  return actor.role === "SUPPORT_MANAGER" || actor.role === "ADMIN";
}

export function ticketCode(number: number): string {
  return `T-${number}`;
}

/** "T-1042", "t1042" o "1042" → 1042. */
export function parseTicketNumber(text: string): number | null {
  const match = /^t?-?(\d{1,9})$/i.exec(text.trim());
  return match ? Number(match[1]) : null;
}

// ─────────────────────────── estados ───────────────────────────

/** Estados activos: el ticket todavía requiere trabajo. */
export const ACTIVE_STATUSES: SupportTicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_BUSINESS",
  "ESCALATED",
];

/**
 * Transiciones válidas. NEW solo existe al crearse: un ticket nunca vuelve a NEW.
 * RESOLVED se puede reabrir; CLOSED solo lo reabre un supervisor (ver `can`).
 */
export const TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED"],
  OPEN: ["IN_PROGRESS", "ESCALATED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_CUSTOMER", "WAITING_BUSINESS", "ESCALATED", "RESOLVED", "CLOSED"],
  WAITING_CUSTOMER: ["IN_PROGRESS", "WAITING_BUSINESS", "ESCALATED", "RESOLVED", "CLOSED"],
  WAITING_BUSINESS: ["IN_PROGRESS", "WAITING_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED"],
  ESCALATED: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "IN_PROGRESS", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function canTransition(from: SupportTicketStatus, to: SupportTicketStatus): boolean {
  return from !== to && TRANSITIONS[from].includes(to);
}

// ─────────────────────────── permisos ───────────────────────────

export interface TicketAccessInfo {
  assignedAgentId: string | null;
  status: SupportTicketStatus;
}

/** Tickets sin dueño que cualquier agente puede ver y tomar. */
const QUEUE_STATUSES: SupportTicketStatus[] = ["NEW", "OPEN"];

export type TicketAction =
  | "view"
  | "take"
  | "release"
  | "assign"
  | "reply"
  | "note"
  | "status"
  | "priority"
  | "category"
  | "link"
  | "escalate"
  | "reopen";

/**
 * Un agente ve únicamente (a) los tickets que tiene asignados y (b) la cola
 * de tickets sin asignar; un supervisor o administrador ve todos. Sin esto,
 * conocer el id de un ticket ajeno daría acceso (IDOR).
 */
export function can(actor: StaffActor, action: TicketAction, ticket: TicketAccessInfo): boolean {
  const manager = isManager(actor);
  const assignee = ticket.assignedAgentId === actor.id;
  const unassigned = ticket.assignedAgentId === null;
  const { status } = ticket;
  const closed = status === "CLOSED";
  const finished = status === "RESOLVED" || closed;
  const owner = assignee || manager;

  switch (action) {
    case "view":
      return manager || assignee || (unassigned && QUEUE_STATUSES.includes(status));
    case "take":
      if (!unassigned) return false;
      return QUEUE_STATUSES.includes(status) || (manager && status === "ESCALATED");
    case "release":
      return !unassigned && owner && !finished;
    case "assign":
      return manager && !closed;
    case "reply":
      return owner && !unassigned && !finished;
    case "note":
      return owner && !closed;
    case "status":
      return owner && !closed;
    case "priority":
    case "category":
    case "link":
      return owner && !closed;
    case "escalate":
      return owner && !finished && status !== "ESCALATED";
    case "reopen":
      if (status === "RESOLVED") return owner;
      if (closed) return manager;
      return false;
  }
}

export function permissionsFor(actor: StaffActor, ticket: TicketAccessInfo): SupportTicketPermissionsDTO {
  return {
    canTake: can(actor, "take", ticket),
    canRelease: can(actor, "release", ticket),
    canAssign: can(actor, "assign", ticket),
    canReply: can(actor, "reply", ticket),
    canNote: can(actor, "note", ticket),
    canChangeStatus: can(actor, "status", ticket),
    canChangePriority: can(actor, "priority", ticket),
    canChangeCategory: can(actor, "category", ticket),
    canLink: can(actor, "link", ticket),
    canEscalate: can(actor, "escalate", ticket),
    canReopen: can(actor, "reopen", ticket),
    isManager: isManager(actor),
  };
}

// ─────────────────────── clasificación de categoría ───────────────────────

/** Slugs de las categorías iniciales (la tabla puede tener más; estas son las que clasifican las reglas). */
export const INITIAL_CATEGORY_SLUGS = [
  "pedido",
  "entrega",
  "pago",
  "reembolso",
  "cancelacion",
  "negocio",
  "cuenta",
  "cupon",
  "promocion",
  "problema_tecnico",
  "seguridad",
  "otro",
] as const;

/** En orden de prioridad: la primera que coincide gana (lo más delicado primero). */
const CATEGORY_RULES: { slug: string; pattern: RegExp }[] = [
  {
    slug: "seguridad",
    pattern: /(fraude|estafa|estafaron|hackearon|hackeo|acceso no autorizado|suplant|phishing|me clonaron|robaron mi (cuenta|tarjeta)|cuenta (hackeada|comprometida))/,
  },
  { slug: "reembolso", pattern: /(reembols|devolucion|devuelv\w* (mi |el |la )?(dinero|plata|pago))/ },
  { slug: "pago", pattern: /(cobr\w+ (doble|dos veces|de mas|demas|sin)|cargo (no autorizado|duplicado|indebido)|pago (rechazado|fallido|no paso|no se proceso)|paypal|tarjeta)/ },
  { slug: "cancelacion", pattern: /(cancel\w+|anular|anulen)/ },
  { slug: "entrega", pattern: /(no (me )?llego|nunca llego|no ha llegado|entrega|repartidor|llego tarde|demora|se (atraso|retraso))/ },
  { slug: "cupon", pattern: /(cupon|codigo de descuento)/ },
  { slug: "promocion", pattern: /(promocion|promo\b|oferta)/ },
  { slug: "cuenta", pattern: /(contrasena|iniciar sesion|no puedo entrar|mi cuenta|cambiar (mi )?(correo|email|telefono)|verificar (mi )?correo|eliminar (mi )?cuenta)/ },
  { slug: "problema_tecnico", pattern: /(error|no carga|no funciona|se cae|se traba|falla|bug|la pagina|la app)/ },
  { slug: "negocio", pattern: /(negocio|tienda|floristeria|vendedor|reclamo al negocio)/ },
  { slug: "pedido", pattern: /(pedido|orden|producto|incompleto|equivocado|incorrecto|faltan?|dano|danado|roto)/ },
];

/** Categoría sugerida por palabras clave. El servidor la valida contra las categorías ACTIVAS de la base. */
export function classifyCategory(text: string): string {
  const normalized = normalizeText(text);
  return CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))?.slug ?? "otro";
}

// ─────────────── sincronización con la conversación del cliente ───────────────

export type ConversationStatusValue = "WAITING_AGENT" | "WITH_AGENT" | "RESOLVED";

/**
 * El estado del TICKET manda; el de la conversación (lo que ve el widget del
 * cliente) se deriva de él: así el chat que ya existe sigue funcionando sin
 * conocer los ocho estados.
 */
export function conversationStatusFor(status: SupportTicketStatus, assigned: boolean): ConversationStatusValue {
  if (status === "RESOLVED" || status === "CLOSED") return "RESOLVED";
  if (status === "NEW" || status === "OPEN") return "WAITING_AGENT";
  if (status === "ESCALATED") return assigned ? "WITH_AGENT" : "WAITING_AGENT";
  return "WITH_AGENT"; // IN_PROGRESS, WAITING_CUSTOMER, WAITING_BUSINESS
}

/** ¿El cliente escribió y todavía nadie del equipo contestó? (base de "necesita respuesta" y del anti-spam de avisos) */
export function hasUnansweredCustomerMessage(ticket: {
  lastCustomerMessageAt: Date | null;
  lastAgentMessageAt: Date | null;
}): boolean {
  if (!ticket.lastCustomerMessageAt) return false;
  if (!ticket.lastAgentMessageAt) return true;
  return ticket.lastAgentMessageAt.getTime() < ticket.lastCustomerMessageAt.getTime();
}

/**
 * Qué le pasa al ticket cuando el cliente escribe:
 *  - esperaba al cliente → vuelve a atención (o a la cola si nadie lo tiene);
 *  - estaba RESUELTO → se REABRE solo, por el mismo camino;
 *  - cualquier otro estado → no cambia.
 */
export function statusAfterCustomerMessage(
  status: SupportTicketStatus,
  assigned: boolean,
): { status: SupportTicketStatus; reopened: boolean } {
  if (status === "WAITING_CUSTOMER") return { status: assigned ? "IN_PROGRESS" : "OPEN", reopened: false };
  if (status === "RESOLVED") return { status: assigned ? "IN_PROGRESS" : "OPEN", reopened: true };
  return { status, reopened: false };
}

// ───────────────────────────── contadores por cola ─────────────────────────────

/**
 * Cuántos tickets hay en cada cola, a partir de UNA consulta agrupada por
 * (estado, agente) ya limitada a lo que el usuario puede ver. Así la bandeja
 * muestra todos los contadores sin hacer una consulta por cada pestaña.
 */
export function computeViewCounts(
  rows: { status: SupportTicketStatus; assignedAgentId: string | null; count: number }[],
  actorId: string,
): Record<SupportTicketView, number> {
  const counts: Record<SupportTicketView, number> = {
    nuevos: 0,
    mios: 0,
    sin_asignar: 0,
    en_atencion: 0,
    esperando_cliente: 0,
    esperando_negocio: 0,
    escalados: 0,
    resueltos: 0,
    cerrados: 0,
    todos: 0,
  };
  for (const row of rows) {
    counts.todos += row.count;
    const active = ACTIVE_STATUSES.includes(row.status);
    if (row.status === "NEW") counts.nuevos += row.count;
    if (row.status === "IN_PROGRESS") counts.en_atencion += row.count;
    if (row.status === "WAITING_CUSTOMER") counts.esperando_cliente += row.count;
    if (row.status === "WAITING_BUSINESS") counts.esperando_negocio += row.count;
    if (row.status === "ESCALATED") counts.escalados += row.count;
    if (row.status === "RESOLVED") counts.resueltos += row.count;
    if (row.status === "CLOSED") counts.cerrados += row.count;
    if (active && row.assignedAgentId === actorId) counts.mios += row.count;
    if (active && row.assignedAgentId === null) counts.sin_asignar += row.count;
  }
  return counts;
}

// ───────────────────────────── métricas ─────────────────────────────

/** Segundos → minutos con un decimal (null si no hay datos). */
export function secondsToMinutes(seconds: number | null): number | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  return Math.round((seconds / 60) * 10) / 10;
}

/** % de conversaciones resueltas SIN llegar a una persona sobre el total resuelto (asistente + persona), 0–100. */
export function botResolutionRate(resolvedByBot: number, resolvedByHuman: number): number | null {
  const total = resolvedByBot + resolvedByHuman;
  if (total === 0) return null;
  return Math.round((resolvedByBot / total) * 1000) / 10;
}

/** El Salvador no tiene horario de verano: siempre UTC-6. */
const SV_OFFSET_MS = 6 * 60 * 60 * 1000;

/** "YYYY-MM-DD" del día calendario (hora de El Salvador) al que pertenece un instante. */
export function svDayKey(date: Date | number): string {
  return new Date((typeof date === "number" ? date : date.getTime()) - SV_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Serie diaria sin huecos: un punto por cada uno de los últimos `days` días
 * (el último es hoy), con 0 donde no hubo tickets. Las filas vienen agrupadas
 * por día desde la base; acá solo se rellenan los días vacíos para que el
 * gráfico no "salte" de una fecha a otra.
 */
export function buildDailySeries(
  days: number,
  now: number,
  created: { day: string; n: number }[],
  resolved: { day: string; n: number }[],
): { date: string; created: number; resolved: number }[] {
  const createdByDay = new Map(created.map((row) => [row.day, row.n]));
  const resolvedByDay = new Map(resolved.map((row) => [row.day, row.n]));
  const series: { date: string; created: number; resolved: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = svDayKey(now - offset * 86_400_000);
    series.push({ date, created: createdByDay.get(date) ?? 0, resolved: resolvedByDay.get(date) ?? 0 });
  }
  return series;
}

/** Variación porcentual contra el período anterior (null si no hay base para comparar). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Filas `groupBy rating` → conteo por estrella [1★, 2★, 3★, 4★, 5★]; ignora valores fuera de 1–5. */
export function ratingDistribution(rows: { rating: number | null; count: number }[]): [number, number, number, number, number] {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const row of rows) {
    if (row.rating !== null && Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5) distribution[row.rating - 1] += row.count;
  }
  return distribution;
}

/**
 * CSAT / DSAT a partir de la distribución de estrellas [1★..5★]:
 *  - satisfechos (CSAT): 4 y 5 estrellas · neutrales: 3 · insatisfechos (DSAT): 1 y 2.
 * Los porcentajes son sobre el total de calificaciones; sin calificaciones no hay porcentaje (null),
 * nunca un 0 % que parezca real.
 */
export function satisfactionBreakdown(distribution: readonly number[]): {
  count: number;
  average: number | null;
  satisfied: number;
  neutral: number;
  dissatisfied: number;
  csatPercent: number | null;
  dsatPercent: number | null;
} {
  const at = (stars: number) => distribution[stars - 1] ?? 0;
  const count = [1, 2, 3, 4, 5].reduce((sum, stars) => sum + at(stars), 0);
  const satisfied = at(4) + at(5);
  const dissatisfied = at(1) + at(2);
  if (count === 0) return { count, average: null, satisfied, neutral: 0, dissatisfied, csatPercent: null, dsatPercent: null };
  const stars = [1, 2, 3, 4, 5].reduce((sum, value) => sum + value * at(value), 0);
  return {
    count,
    average: Math.round((stars / count) * 100) / 100,
    satisfied,
    neutral: at(3),
    dissatisfied,
    csatPercent: Math.round((satisfied / count) * 1000) / 10,
    dsatPercent: Math.round((dissatisfied / count) * 1000) / 10,
  };
}

/** Rango de estrellas de cada tipo de calificación. */
export function ratingRangeFor(kind: "all" | "good" | "neutral" | "bad"): { gte: number; lte: number } {
  switch (kind) {
    case "good":
      return { gte: 4, lte: 5 };
    case "neutral":
      return { gte: 3, lte: 3 };
    case "bad":
      return { gte: 1, lte: 2 };
    default:
      return { gte: 1, lte: 5 };
  }
}
