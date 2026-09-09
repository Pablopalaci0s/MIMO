/**
 * Envelope shape for every /api/* response. Keeping this uniform is what
 * lets apps/mobile (React Native + Expo, built later) consume the same API
 * as apps/web without ever touching Postgres or Prisma directly.
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export type UserRole = "USER" | "BUSINESS" | "ADMIN";

export type DeliveryWindow = "ASAP" | "MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING";
