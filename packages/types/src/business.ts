import type { DeliveryWindow } from "./common";
import type { OrderStatus, PersonalizationInput } from "./order";

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface BusinessProfileDTO {
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  addressLine: string | null;
  paypalEmail: string | null;
  commissionRate: number;
}

export interface BusinessProfileInput {
  description?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  phone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  addressLine?: string;
  paypalEmail?: string;
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
  /** Aviso puntual sobre el pago de esta parte del pedido (ej. no pudimos
   * pagarte porque falta tu correo de PayPal) — null si no hay nada que
   * avisar. Ver `payment-split-service.ts`. */
  paymentNote: string | null;
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

/** Metadatos de un documento de verificación — el archivo nunca viaja en el DTO. */
export type BusinessDocumentType = "DUI_FRONT" | "DUI_BACK" | "OWNER_PHOTO" | "TAX_ID" | "PERMIT";

export interface BusinessDocumentDTO {
  type: BusinessDocumentType;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** Si un admin lo rechazó, el motivo que ve el titular; null si está vigente. */
  rejectionReason: string | null;
}

/** Registro de que un administrador verificó la identidad del titular. Nunca lleva el DUI completo. */
export interface IdentityVerificationDTO {
  id: string;
  verifiedAt: string;
  verifiedByName: string | null;
  reviewedDocuments: BusinessDocumentType[];
  documentLegible: boolean;
  documentValid: boolean;
  identityMatches: boolean;
  photoMatches: boolean;
  duiLast4: string;
  /** Cuándo se borran las imágenes de identidad (null si ya no hay borrado programado). */
  imagesPurgeAfter: string | null;
  /** Cuándo se borraron efectivamente (null si todavía no). */
  imagesDeletedAt: string | null;
}
