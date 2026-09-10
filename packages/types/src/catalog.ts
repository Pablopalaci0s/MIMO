export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  parentId: string | null;
}

export type OccasionType = "OCCASION" | "EMOTION";

export interface OccasionDTO {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  type: OccasionType;
}

export interface BusinessSummaryDTO {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
  isDemo: boolean;
  ratingAvg: number;
  ratingCount: number;
  municipalityName: string | null;
}

export interface FeaturedBusinessDTO extends BusinessSummaryDTO {
  coverUrl: string | null;
  previewImageUrl: string | null;
  description: string | null;
  deliveryFee: number | null;
  estimatedMinutes: number | null;
}

export interface BusinessDTO extends BusinessSummaryDTO {
  description: string | null;
  coverUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  addressLine: string | null;
  openingHours: Record<string, [string, string]> | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
}

export interface ProductImageDTO {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface ProductSummaryDTO {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  business: BusinessSummaryDTO;
  categorySlug: string;
  ratingAvg: number;
  ratingCount: number;
  availableToday: boolean;
  preparationTimeMinutes: number;
  salesCount: number;
}

export interface ProductDTO extends ProductSummaryDTO {
  description: string;
  images: ProductImageDTO[];
  isPersonalizable: boolean;
  stock: number;
  occasions: OccasionDTO[];
}

export interface ProductFilters {
  categorySlug?: string;
  occasionSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  municipalitySlug?: string;
  availableToday?: boolean;
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "sales";
  query?: string;
}
