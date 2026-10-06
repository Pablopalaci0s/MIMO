import type { OrderStatus, PaymentProvider, PaymentStatus } from "./order";

export type SupportConversationStatus = "BOT" | "WAITING_AGENT" | "WITH_AGENT" | "RESOLVED";
export type SupportMessageRole = "USER" | "BOT" | "AGENT";

/** Snapshot de un producto que el bot mostró — guardado en el mensaje, no
 * recalculado al recargar, así el chat se ve igual que cuando se escribió. */
export interface SupportProductCardDTO {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  businessName: string;
}

export interface SupportOrderCardDTO {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  items: { productName: string; businessName: string; quantity: number; status: OrderStatus }[];
}

export interface SupportMessageMetadata {
  products?: SupportProductCardDTO[];
  order?: SupportOrderCardDTO;
  /** Respuestas rápidas que el bot sugiere después de este mensaje. */
  suggestions?: string[];
  /** El bot quiere pasar a una persona pero falta el contacto de un
   * visitante sin cuenta: la pantalla le muestra el formulario. */
  requestContact?: boolean;
  /** El motor de respaldo no supo responder — dos seguidos pasan a una persona. */
  unresolved?: boolean;
}

export interface SupportMessageDTO {
  id: string;
  role: SupportMessageRole;
  /** Nombre de quien escribió, solo para mensajes de una persona de soporte. */
  authorName: string | null;
  body: string;
  metadata: SupportMessageMetadata | null;
  createdAt: string;
}

export interface SupportConversationDTO {
  id: string;
  status: SupportConversationStatus;
  messages: SupportMessageDTO[];
  /** La conversación terminó y todavía no dejó calificación. */
  canRate: boolean;
  rating: number | null;
  /** Número de ticket (ej. "T-1042") una vez que la conversación pasó a una persona. */
  ticketCode: string | null;
}
