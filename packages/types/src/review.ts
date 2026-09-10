export interface ReviewDTO {
  id: string;
  userName: string;
  productRating: number | null;
  businessRating: number | null;
  deliveryRating: number | null;
  comment: string | null;
  createdAt: string;
}

export interface ReviewInput {
  orderId: string;
  productId?: string;
  businessId?: string;
  productRating?: number;
  businessRating?: number;
  deliveryRating?: number;
  comment?: string;
}

/** Un `OrderItem` entregado del usuario que todavía no tiene reseña — la
 * única fuente para saber qué puede reseñar (sección 26: solo compradores
 * que completaron la compra). */
export interface ReviewableItemDTO {
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  businessId: string;
  businessName: string;
}
