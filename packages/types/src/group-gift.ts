export type GroupGiftStatus = "OPEN" | "COMPLETED" | "CANCELLED";
export type GroupGiftContributionStatus = "PENDING" | "PAID" | "REFUNDED";

export interface GroupGiftContributionDTO {
  id: string;
  contributorName: string;
  amount: number;
  status: GroupGiftContributionStatus;
  createdAt: string;
}

export interface GroupGiftDTO {
  id: string;
  slug: string;
  title: string;
  message: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  targetAmount: number;
  collectedAmount: number;
  deadline: string | null;
  status: GroupGiftStatus;
  createdAt: string;
}

export interface GroupGiftPublicDTO extends GroupGiftDTO {
  organizerName: string;
  contributions: GroupGiftContributionDTO[];
}

export interface GroupGiftManageDTO extends GroupGiftDTO {
  organizerPaypalEmail: string;
  contributions: GroupGiftContributionDTO[];
}

export interface GroupGiftInput {
  productId: string;
  title: string;
  message?: string;
  targetAmount: number;
  deadline?: string;
  organizerPaypalEmail: string;
}

export interface ContributeToGroupGiftInput {
  contributorName: string;
  amount: number;
}
