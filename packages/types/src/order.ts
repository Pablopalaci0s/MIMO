import type { DeliveryWindow } from "./common";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface PersonalizationInput {
  message?: string;
  dedication?: string;
  color?: string;
  size?: string;
  cardText?: string;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
  personalization?: PersonalizationInput;
}

/** Ítem del carrito tal como vive en el cliente (localStorage) — incluye
 * los datos de presentación para no tener que volver a pedirlos al mostrar
 * el carrito. El precio acá es solo para mostrar: el servidor siempre
 * recalcula desde la base de datos al hacer checkout. */
export interface CartItem {
  productId: string;
  productSlug: string;
  productName: string;
  businessId: string;
  businessName: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  personalization?: PersonalizationInput;
}

export interface CheckoutAddressInput {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  reference?: string;
  municipalityId: string;
  deliveryDate: string; // ISO date
  deliveryWindow: DeliveryWindow;
  deliveryInstructions?: string;
}

export interface CheckoutInput {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  items: CartItemInput[];
  address: CheckoutAddressInput;
  isSurpriseMode: boolean;
  hideBuyerFromRecipient: boolean;
  surpriseInstructions?: string;
  paymentProvider: "CARD" | "PAYPAL" | "CASH" | "OTHER";
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  businessId: string;
  businessName: string;
  quantity: number;
  unitPrice: number;
  personalization: PersonalizationInput | null;
  status: OrderStatus;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  items: OrderItemDTO[];
  isSurpriseMode: boolean;
  createdAt: string;
}

export type OrderMessageSender = "CUSTOMER" | "BUSINESS";

export interface OrderMessageDTO {
  id: string;
  senderRole: OrderMessageSender;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface OrderMessageInput {
  body: string;
}
