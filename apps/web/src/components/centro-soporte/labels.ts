import type {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  SupportTicketPriority,
  SupportTicketSource,
  SupportTicketStatus,
  SupportTicketView,
} from "@mimo/types";

/** Textos y colores del centro de soporte, compartidos por todos sus componentes. */

export const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  NEW: "Nuevo",
  OPEN: "Abierto",
  IN_PROGRESS: "En atención",
  WAITING_CUSTOMER: "Esperando cliente",
  WAITING_BUSINESS: "Esperando negocio",
  ESCALATED: "Escalado",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

export const STATUS_TONE: Record<SupportTicketStatus, string> = {
  NEW: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  OPEN: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  IN_PROGRESS: "bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  WAITING_CUSTOMER: "bg-sc-primary-soft text-sc-primary",
  WAITING_BUSINESS: "bg-slate-200 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300",
  ESCALATED: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  CLOSED: "bg-neutral-200 text-neutral-600 dark:bg-neutral-300/40",
};

export const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  LOW: "Baja",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const PRIORITY_DOT: Record<SupportTicketPriority, string> = {
  LOW: "bg-neutral-300",
  NORMAL: "bg-sky-400",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-600",
};

export const SOURCE_LABEL: Record<SupportTicketSource, string> = {
  CHATBOT: "Escalado por el asistente",
  CUSTOMER_REQUEST: "El cliente pidió hablar con una persona",
  FORM: "Formulario de contacto",
  STAFF: "Creado por el equipo",
};

export const VIEW_LABEL: Record<SupportTicketView, string> = {
  nuevos: "Nuevos",
  mios: "Mis tickets",
  sin_asignar: "Nuevos / Sin asignar",
  en_atencion: "En atención",
  esperando_cliente: "Esperando cliente",
  esperando_negocio: "Esperando negocio",
  escalados: "Escalados",
  resueltos: "Resueltos",
  cerrados: "Cerrados",
  todos: "Todos",
};

/** Orden de las pestañas: las colas de trabajo primero. */
export const VIEW_ORDER: SupportTicketView[] = [
  "sin_asignar",
  "mios",
  "todos",
  "nuevos",
  "en_atencion",
  "esperando_cliente",
  "esperando_negocio",
  "escalados",
  "resueltos",
  "cerrados",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  CARD: "Tarjeta",
  PAYPAL: "PayPal",
  CASH: "Efectivo contra entrega",
  OTHER: "Otro",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
};

/** Etiquetas del historial (auditoría) del ticket. */
export const TIMELINE_LABEL: Record<string, string> = {
  "ticket.created": "Ticket creado",
  "ticket.assigned": "Ticket asignado",
  "ticket.reassigned": "Ticket reasignado",
  "ticket.released": "Ticket liberado",
  "ticket.status_changed": "Estado cambiado",
  "ticket.resolved": "Ticket resuelto",
  "ticket.closed": "Ticket cerrado",
  "ticket.reopened": "Ticket reabierto",
  "ticket.priority_changed": "Prioridad cambiada",
  "ticket.category_changed": "Categoría cambiada",
  "ticket.message_sent": "Respuesta enviada al cliente",
  "ticket.note_added": "Nota interna agregada",
  "ticket.escalated": "Ticket escalado",
  "ticket.order_linked": "Pedido vinculado",
  "ticket.order_unlinked": "Pedido desvinculado",
  "ticket.business_linked": "Negocio vinculado",
  "ticket.business_unlinked": "Negocio desvinculado",
  "ticket.address_viewed": "Dirección de entrega consultada",
  "ticket.rated": "El cliente calificó la atención",
};

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 5 minutos", "ayer"… (para listas y mensajes). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "ahora";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(seconds / 86_400), "day");
  return new Date(iso).toLocaleDateString("es-SV");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-SV", { dateStyle: "short", timeStyle: "short" });
}

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-SV", { style: "currency", currency }).format(amount);
}

/** 75 → "1 h 15 min"; 1.5 → "1.5 min"; null → "Sin datos". */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "Sin datos";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours < 24) return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const hoursRest = hours % 24;
  return hoursRest > 0 ? `${days} d ${hoursRest} h` : `${days} d`;
}

/** Colores de gráficos (clases literales: Tailwind no detecta clases armadas con texto). */
export const STATUS_CHART: Record<SupportTicketStatus, { stroke: string; swatch: string }> = {
  NEW: { stroke: "stroke-amber-400", swatch: "bg-amber-400" },
  OPEN: { stroke: "stroke-red-500", swatch: "bg-red-500" },
  IN_PROGRESS: { stroke: "stroke-red-300", swatch: "bg-red-300" },
  WAITING_CUSTOMER: { stroke: "stroke-sc-primary", swatch: "bg-sc-primary" },
  WAITING_BUSINESS: { stroke: "stroke-slate-500", swatch: "bg-slate-500" },
  ESCALATED: { stroke: "stroke-purple-500", swatch: "bg-purple-500" },
  RESOLVED: { stroke: "stroke-sc-success", swatch: "bg-sc-success" },
  CLOSED: { stroke: "stroke-neutral-300", swatch: "bg-neutral-300" },
};

export const PRIORITY_BAR: Record<SupportTicketPriority, string> = {
  LOW: "bg-neutral-300",
  NORMAL: "bg-sky-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-600",
};

/** Barra lateral de color de cada fila de la bandeja: la prioridad se ve de lejos. */
export const PRIORITY_EDGE: Record<SupportTicketPriority, string> = {
  LOW: "bg-neutral-200",
  NORMAL: "bg-sky-400",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-600",
};
