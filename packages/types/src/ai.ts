import type { ProductSummaryDTO } from "./catalog";

/** Lo que la IA extrae del texto libre del usuario. Nunca contiene precios
 * ni productos inventados — solo la interpretación de la solicitud. */
export interface ParsedGiftIntent {
  recipient?: string;
  relationship?: string;
  occasion?: string;
  budgetMin?: number;
  budgetMax?: number;
  likes: string[];
  personality: string[];
  location?: string;
  date?: string;
}

export interface GiftRecommendation {
  product: ProductSummaryDTO;
  explanation: string;
}

export interface RecommendGiftsRequest {
  message: string;
  personality?: string[];
  sessionId: string;
}

export interface RecommendGiftsResponse {
  intent: ParsedGiftIntent;
  recommendations: GiftRecommendation[];
  usedAI: boolean;
}

export interface GenerateDedicationRequest {
  tone: "romantic" | "funny" | "formal" | "short" | "heartfelt";
  instructions?: string;
  recipientName?: string;
  occasion?: string;
}

export interface GenerateDedicationResponse {
  options: string[];
  usedAI: boolean;
}
