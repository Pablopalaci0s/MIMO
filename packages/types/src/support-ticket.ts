import type { OrderStatus, PaymentProvider, PaymentStatus } from "./order";
import type { SupportMessageMetadata, SupportMessageRole } from "./support";

export type SupportTicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "WAITING_BUSINESS"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SupportTicketSource = "CHATBOT" | "CUSTOMER_REQUEST" | "FORM" | "STAFF";
export type SupportMessageVisibility = "PUBLIC" | "INTERNAL";

/** Vistas (colas) de la bandeja. */
export type SupportTicketView =
  | "nuevos"
  | "mios"
  | "sin_asignar"
  | "en_atencion"
  | "esperando_cliente"
  | "esperando_negocio"
  | "escalados"
  | "resueltos"
  | "cerrados"
  | "todos";

export interface SupportCategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  defaultPriority: SupportTicketPriority;
  isActive: boolean;
  position: number;
}

export interface SupportMacroDTO {
  id: string;
  title: string;
  body: string;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
}

export interface SupportStaffMemberDTO {
  id: string;
  name: string;
  role: "SUPPORT_AGENT" | "SUPPORT_MANAGER" | "ADMIN";
  /** Tickets abiertos que tiene a su cargo ahora mismo. */
  activeTickets: number;
}

export interface SupportTicketListItemDTO {
  id: string;
  number: number;
  /** Código legible, ej. "T-1042". */
  code: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  categorySlug: string;
  categoryName: string;
  customerName: string;
  isGuest: boolean;
  orderNumber: string | null;
  businessName: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  escalatedFromBot: boolean;
  /** El último mensaje es del cliente y todavía nadie del equipo contestó. */
  needsReply: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
}

export interface SupportTicketListDTO {
  items: SupportTicketListItemDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Cuántos tickets hay en cada cola (una sola consulta agrupada). */
  counts: Record<SupportTicketView, number>;
}

export interface SupportTicketMessageDTO {
  id: string;
  role: SupportMessageRole;
  visibility: SupportMessageVisibility;
  /** Nombre completo de quien escribió (solo para el equipo); null si es el cliente o el asistente. */
  authorName: string | null;
  body: string;
  /** Se ocultó un dato sensible (DUI / tarjeta) al guardar este mensaje. */
  redacted: boolean;
  metadata: SupportMessageMetadata | null;
  createdAt: string;
}

export interface SupportTicketMessagesDTO {
  /** En orden cronológico (más viejo primero). */
  items: SupportTicketMessageDTO[];
  /** Hay mensajes anteriores que todavía no se cargaron. */
  hasMore: boolean;
  /** Para pedir el bloque anterior: el `createdAt` del primer mensaje cargado. */
  nextCursor: string | null;
}

export interface SupportCustomerCardDTO {
  isGuest: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  memberSince: string | null;
  orderCount: number;
  ticketCount: number;
  recentOrders: { orderNumber: string; status: OrderStatus; total: number; createdAt: string }[];
  previousTickets: { id: string; code: string; subject: string; status: SupportTicketStatus; createdAt: string }[];
}

export interface SupportTicketOrderCardDTO {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  buyerName: string;
  /** false si el pedido NO es del cliente del ticket (hay que revisarlo antes de actuar). */
  belongsToCustomer: boolean | null;
  isSurprise: boolean;
  payment: { provider: PaymentProvider; status: PaymentStatus; paidAt: string | null } | null;
  items: {
    productName: string;
    businessName: string;
    quantity: number;
    status: OrderStatus;
    updatedAt: string;
  }[];
  /** Solo el municipio; la dirección completa se pide aparte (queda auditada). */
  deliveryMunicipality: string | null;
  hasAddress: boolean;
}

export interface SupportOrderAddressDTO {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  reference: string | null;
  municipality: string | null;
  department: string | null;
  deliveryDate: string;
  deliveryWindow: string;
  deliveryInstructions: string | null;
}

export interface SupportBusinessCardDTO {
  id: string;
  name: string;
  slug: string;
  status: string;
  phone: string | null;
  municipality: string | null;
}

export interface SupportTimelineEntryDTO {
  action: string;
  actorName: string | null;
  createdAt: string;
  /** Solo datos no sensibles (estados, prioridades, categorías). */
  detail: Record<string, string | number | boolean | null>;
}

/** Qué puede hacer QUIEN mira el ticket — solo para esconder botones; el servidor vuelve a validar cada acción. */
export interface SupportTicketPermissionsDTO {
  canTake: boolean;
  canRelease: boolean;
  canAssign: boolean;
  canReply: boolean;
  canNote: boolean;
  canChangeStatus: boolean;
  canChangePriority: boolean;
  canChangeCategory: boolean;
  canLink: boolean;
  canEscalate: boolean;
  canReopen: boolean;
  isManager: boolean;
}

export interface SupportTicketDetailDTO {
  ticket: SupportTicketListItemDTO & {
    conversationId: string;
    source: SupportTicketSource;
    summary: string | null;
    escalationReason: string | null;
    firstResponseAt: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    reopenCount: number;
    rating: number | null;
    ratingComment: string | null;
    categoryId: string;
  };
  customer: SupportCustomerCardDTO;
  order: SupportTicketOrderCardDTO | null;
  business: SupportBusinessCardDTO | null;
  timeline: SupportTimelineEntryDTO[];
  permissions: SupportTicketPermissionsDTO;
}

export interface SupportMetricsDTO {
  rangeDays: number;
  byStatus: Record<SupportTicketStatus, number>;
  created: number;
  open: number;
  resolved: number;
  pending: number;
  urgent: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  byAgent: { agentId: string | null; name: string; open: number; resolved: number }[];
  byCategory: { slug: string; name: string; count: number }[];
  escalatedByBot: number;
  /** Conversaciones del período resueltas sin llegar a una persona vs. resueltas por una persona. */
  resolvedByBot: number;
  resolvedByHuman: number;
  botResolutionRate: number | null;
  csat: {
    average: number | null;
    count: number;
    /** Cantidad de calificaciones de 1 a 5 estrellas (índice 0 = 1 estrella). */
    distribution: [number, number, number, number, number];
  };
  /** Tickets creados y resueltos por día (hora de El Salvador), uno por cada día del período, sin huecos. */
  daily: { date: string; created: number; resolved: number }[];
  /** Mismo largo de período inmediatamente anterior: para mostrar si va mejor o peor. */
  previous: { created: number; resolved: number };
  /** Tickets activos AHORA por prioridad. */
  byPriority: Record<SupportTicketPriority, number>;
}

// ───────────────────────── calificaciones (CSAT / DSAT) ─────────────────────────

/** Qué calificaciones listar: buenas (4–5 ★), neutrales (3 ★) o malas (1–2 ★). */
export type SupportRatingKind = "all" | "good" | "neutral" | "bad";

export interface SupportRatingSummaryDTO {
  count: number;
  /** Promedio de estrellas (1–5), null si no hay calificaciones. */
  average: number | null;
  /** Cantidad por estrella (índice 0 = 1 ★). */
  distribution: [number, number, number, number, number];
  /** 4–5 ★. */
  satisfied: number;
  /** 3 ★. */
  neutral: number;
  /** 1–2 ★. */
  dissatisfied: number;
  /** % de satisfechos (CSAT), null si no hay calificaciones. */
  csatPercent: number | null;
  /** % de insatisfechos (DSAT), null si no hay calificaciones. */
  dsatPercent: number | null;
}

export interface SupportRatingItemDTO {
  ticketId: string;
  ticketCode: string;
  subject: string;
  categoryName: string;
  /** Solo el nombre de pila del cliente. */
  customerName: string;
  rating: number;
  comment: string | null;
  ratedAt: string;
}

export interface SupportRatingsDTO {
  rangeDays: number;
  /** De quién son las calificaciones: una persona, o todo el equipo (agentId null). */
  scope: { agentId: string | null; label: string; isSelf: boolean };
  summary: SupportRatingSummaryDTO;
  /** El mismo largo de período justo antes, para comparar. */
  previous: SupportRatingSummaryDTO;
  kind: SupportRatingKind;
  items: SupportRatingItemDTO[];
  /** Cuántas calificaciones cumplen el filtro (items trae solo las más recientes). */
  matching: number;
  /** Solo para supervisión: a quién se puede mirar. */
  agents: { id: string; name: string; username: string | null }[];
}
