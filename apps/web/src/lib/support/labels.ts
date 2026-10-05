import type { OrderStatus, PaymentProvider, PaymentStatus } from "@mimo/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  CASH: "Efectivo contra entrega",
  PAYPAL: "PayPal",
  CARD: "Tarjeta",
  OTHER: "Otro",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolsado parcialmente",
};
