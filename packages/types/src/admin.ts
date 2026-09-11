import type { UserRole } from "./common";

export interface AdminStatsDTO {
  totalUsers: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  totalOrders: number;
  totalRevenue: number;
  pendingReports: number;
  pendingReviews: number;
  pendingCoverageRequests: number;
}

export type BusinessStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export interface AdminBusinessDTO {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  verified: boolean;
  isDemo: boolean;
  municipalityName: string | null;
  ownerEmail: string | null;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  commissionRate: number;
  createdAt: string;
}

export interface AdminBusinessUpdateInput {
  status?: BusinessStatus;
  verified?: boolean;
  commissionRate?: number;
}

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isSuspended: boolean;
  businessCount: number;
  orderCount: number;
  createdAt: string;
}

export interface AdminUserUpdateInput {
  role?: UserRole;
  isSuspended?: boolean;
}

export interface AdminCategoryDTO {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  parentId: string | null;
  position: number;
  productCount: number;
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  emoji?: string;
  parentId?: string | null;
  position: number;
}

export type ReportTargetType = "PRODUCT" | "BUSINESS" | "REVIEW" | "USER";
export type ReportStatus = "OPEN" | "REVIEWED" | "RESOLVED" | "DISMISSED";

export interface AdminReportDTO {
  id: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string | null;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
}

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminBannerDTO {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  position: number;
  createdAt: string;
}

export interface AdminBannerInput {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  position: number;
}

export interface AdminReviewDTO {
  id: string;
  userName: string;
  productName: string | null;
  businessName: string | null;
  productRating: number | null;
  businessRating: number | null;
  deliveryRating: number | null;
  comment: string | null;
  status: ModerationStatus;
  createdAt: string;
}
