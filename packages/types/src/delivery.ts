export interface DeliveryCoverageResult {
  businessId: string;
  businessName: string;
  covered: boolean;
  deliveryFee: number | null;
  estimatedMinutes: number | null;
}

export interface CoverageRequestInput {
  businessId: string;
  municipalityId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export type CoverageRequestStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface CoverageRequestDTO {
  id: string;
  businessName: string;
  municipalityName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  requesterName: string | null;
  status: CoverageRequestStatus;
  createdAt: string;
}
