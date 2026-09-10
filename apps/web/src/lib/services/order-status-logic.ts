import type { OrderItemStatus, OrderStatus } from "@mimo/database";

/** A qué estados puede pasar cada `OrderItem` desde su estado actual — evita
 * que el negocio salte pasos (ej. de PENDING directo a DELIVERED) o reviva
 * un ítem ya cerrado. */
export const NEXT_ALLOWED: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidTransition(from: OrderItemStatus, to: OrderItemStatus): boolean {
  return NEXT_ALLOWED[from].includes(to);
}

/** El progreso general del `Order` es el del ítem menos avanzado entre los
 * que siguen activos (no cancelados) — así un negocio no puede "adelantar"
 * el pedido completo mientras otro negocio del mismo carrito multi-tienda
 * todavía no confirma el suyo. Si todos los ítems se cancelan, el pedido
 * completo queda cancelado. */
const STATUS_RANK: Record<Exclude<OrderItemStatus, "CANCELLED">, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

export function computeOrderStatus(itemStatuses: OrderItemStatus[]): OrderStatus {
  const active = itemStatuses.filter((status) => status !== "CANCELLED") as Exclude<
    OrderItemStatus,
    "CANCELLED"
  >[];
  if (active.length === 0) return "CANCELLED";
  const minRank = Math.min(...active.map((status) => STATUS_RANK[status]));
  const [status] = Object.entries(STATUS_RANK).find(([, rank]) => rank === minRank)!;
  return status as OrderStatus;
}
