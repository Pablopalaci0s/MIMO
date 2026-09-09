import type { ParsedGiftIntent } from "@mimo/types";
import type { GenerateDedicationRequest } from "@mimo/types";

/**
 * Contract every AI provider must satisfy. AIService depends only on this
 * interface, so swapping Anthropic for another provider later never touches
 * callers (route handlers, components) — see section 32 of the product spec.
 */
export interface AIProvider {
  analyzeIntent(message: string): Promise<ParsedGiftIntent>;
  generateDedications(request: GenerateDedicationRequest): Promise<string[]>;
}
