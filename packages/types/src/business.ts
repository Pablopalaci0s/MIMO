import type { DeliveryWindow } from "./common";
import type { OrderStatus, PersonalizationInput } from "./order";

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface BusinessProfileDTO {
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  addressLine: string | null;
}

export interface BusinessProfileInput {
  description?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  addressLine?: string;
}

/** Un `OrderItem` visto desde el panel del negocio dueño de ese ítem — trae
 * todo lo que ese negocio necesita para prepararlo y entregarlo, sin
 * exponer datos de otros negocios del mismo pedido (carrito multi-tienda). */
export interface BusinessOrderItemDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  businessId: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  personalization: PersonalizationInput | null;
  status: OrderStatus;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  reference: string | null;
  municipalityName: string | null;
  deliveryDate: string;
  deliveryWindow: DeliveryWindow;
  deliveryInstructions: string | null;
  isSurpriseMode: boolean;
  surpriseInstructions: string | null;
}

export interface BusinessDashboardSummaryDTO {
  businessName: string;
  businessSlug: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  pendingOrderItems: number;
  todaySales: number;
  monthSales: number;
  activeProducts: number;
  ratingAvg: number;
  ratingCount: number;
  recentOrderItems: BusinessOrderItemDTO[];
}

export interface BusinessProductImageDTO {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface BusinessProductDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string;
  categorySlug: string;
  stock: number;
  isPersonalizable: boolean;
  availableToday: boolean;
  preparationTimeMinutes: number;
  status: ProductStatus;
  images: BusinessProductImageDTO[];
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  createdAt: string;
}

export interface BusinessProductImageInput {
  url: string;
  altText?: string;
}

export interface BusinessProductInput {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  categoryId: string;
  stock: number;
  isPersonalizable: boolean;
  availableToday: boolean;
  preparationTimeMinutes: number;
  status: ProductStatus;
  images: BusinessProductImageInput[];
}

export interface BusinessDeliveryZoneDTO {
  id: string;
  name: string;
  municipalityId: string | null;
  municipalityName: string | null;
  deliveryFee: number;
  estimatedMinutes: number;
  isActive: boolean;
}

export interface BusinessDeliveryZoneInput {
  name: string;
  municipalityId?: string | null;
  deliveryFee: number;
  estimatedMinutes: number;
  isActive: boolean;
}

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type WeeklyHours = Record<WeekDay, [string, string] | null>;

export interface BusinessHoursDTO {
  openingHours: WeeklyHours;
  preparationTimeMinutes: number;
}
