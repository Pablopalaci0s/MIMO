import { prisma } from "@mimo/database";
import type {
  GenerateDedicationRequest,
  GenerateDedicationResponse,
  GiftRecommendation,
  ParsedGiftIntent,
  RecommendGiftsRequest,
  RecommendGiftsResponse,
} from "@mimo/types";
import { toProductSummaryDTO } from "./dto";
import { parseIntentHeuristically } from "./heuristics";
import type { AIProvider } from "./provider";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { explainMatch, scoreProductsForIntent } from "./scoring";

const FALLBACK_DEDICATIONS: Record<GenerateDedicationRequest["tone"], string[]> = {
  romantic: [
    "Espero que este pequeño detalle te recuerde lo especial que sos para mí. ❤️",
    "Cada detalle de esto lo elegí pensando en vos. Te quiero muchísimo.",
    "Que este regalo te alcance como te alcanza mi cariño: sin límites.",
  ],
  funny: [
    "Te mereces algo lindo... y también soportarme un rato más. ¡Feliz día!",
    "Esto es prueba oficial de que sí te pienso, aunque no conteste rápido los mensajes.",
    "Regalo entregado. Abrazo pendiente. Cariño, todos los días.",
  ],
  formal: [
    "Con aprecio y en esta ocasión especial, espero que disfrutes este detalle.",
    "Un gesto sencillo para expresar lo mucho que valoro nuestra relación.",
    "Que este detalle te encuentre muy bien y sirva para celebrar este momento.",
  ],
  short: ["Pensando en vos. ❤️", "Para vos, con cariño.", "Feliz día, te quiero."],
  heartfelt: [
    "Gracias por estar siempre. Este detalle es una forma pequeña de decirte lo mucho que significás para mí.",
    "No siempre encuentro las palabras, así que espero que este gesto hable por mí.",
    "Quería que supieras lo agradecido/a que estoy de tenerte en mi vida.",
  ],
};

/**
 * Único punto de entrada a la IA del producto (sección 32). Nunca expone el
 * proveedor directamente a rutas ni componentes, y siempre puede operar sin
 * IA disponible (sección 33) porque los métodos de recomendación consultan
 * la base de datos por sí mismos.
 */
export class AIService {
  private readonly provider: AIProvider | null;

  constructor(provider: AIProvider | null = AIService.defaultProvider()) {
    this.provider = provider;
  }

  private static defaultProvider(): AIProvider | null {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return apiKey ? new AnthropicProvider(apiKey) : null;
  }

  get isAIAvailable(): boolean {
    return this.provider !== null;
  }

  async analyzeUserRequest(message: string): Promise<{ intent: ParsedGiftIntent; usedAI: boolean }> {
    if (this.provider) {
      try {
        const intent = await this.provider.analyzeIntent(message);
        return { intent, usedAI: true };
      } catch (error) {
        console.error("[AIService] analyzeIntent falló, usando heurística:", error);
      }
    }
    return { intent: parseIntentHeuristically(message), usedAI: false };
  }

  explainRecommendation(scored: Parameters<typeof explainMatch>[0], intent: ParsedGiftIntent): string {
    return explainMatch(scored, intent);
  }

  async recommendGifts(request: RecommendGiftsRequest, userId?: string): Promise<RecommendGiftsResponse> {
    const { intent, usedAI } = await this.analyzeUserRequest(request.message);
    if (request.personality?.length) {
      intent.personality = Array.from(new Set([...intent.personality, ...request.personality]));
    }

    const personalizedIntent = userId ? await this.personalizeRecommendations(userId, intent) : intent;
    const scored = await scoreProductsForIntent(personalizedIntent);
    const recommendations: GiftRecommendation[] = scored.map((entry) => ({
      product: toProductSummaryDTO(entry.product),
      explanation: this.explainRecommendation(entry, intent),
    }));

    const saved = await prisma.aIRecommendation.create({
      data: {
        userId,
        sessionId: request.sessionId,
        requestText: request.message,
        parsedIntent: intent as unknown as object,
        products: {
          create: scored.map((entry, index) => ({
            productId: entry.product.id,
            position: index,
            explanation: recommendations[index].explanation,
          })),
        },
      },
    });
    void saved;

    return { intent, recommendations, usedAI };
  }

  async generateDedication(request: GenerateDedicationRequest): Promise<GenerateDedicationResponse> {
    if (this.provider) {
      try {
        const options = await this.provider.generateDedications(request);
        if (options.length > 0) return { options, usedAI: true };
      } catch (error) {
        console.error("[AIService] generateDedications falló, usando plantillas:", error);
      }
    }
    return { options: FALLBACK_DEDICATIONS[request.tone], usedAI: false };
  }

  /**
   * Sesga el scoring con el historial reciente del usuario (categorías
   * favoritas y compradas). Nunca guarda más que los IDs de categoría
   * necesarios para esto — sección 25: aprender de forma responsable.
   */
  async personalizeRecommendations(userId: string, intent: ParsedGiftIntent): Promise<ParsedGiftIntent> {
    const [favorites, pastOrderItems] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId, targetType: "PRODUCT" },
        include: { product: { include: { category: true } } },
        take: 10,
      }),
      prisma.orderItem.findMany({
        where: { order: { buyerId: userId } },
        include: { product: { include: { category: true } } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const preferredCategories = new Set<string>();
    for (const favorite of favorites) {
      if (favorite.product) preferredCategories.add(favorite.product.category.name.toLowerCase());
    }
    for (const item of pastOrderItems) {
      preferredCategories.add(item.product.category.name.toLowerCase());
    }

    return {
      ...intent,
      likes: Array.from(new Set([...intent.likes, ...preferredCategories])),
    };
  }
}
