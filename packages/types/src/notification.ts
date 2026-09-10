export type NotificationType =
  | "ORDER_CONFIRMED"
  | "ORDER_IN_PROGRESS"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "IMPORTANT_DATE_REMINDER"
  | "BUSINESS_APPROVED"
  | "BUSINESS_SUSPENDED"
  | "REVIEW_RECEIVED"
  | "PROMOTION"
  | "SYSTEM";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  linkHref: string | null;
  createdAt: string;
}

export interface NotificationListDTO {
  items: NotificationDTO[];
  unreadCount: number;
}
