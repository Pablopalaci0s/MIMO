import { prisma, type Product, type ProductImage, type Business, type Category, type ProductOccasion, type Occasion } from "@mimo/database";
import type { ParsedGiftIntent } from "@mimo/types";

export type ScorableProduct = Product & {
  images: ProductImage[];
  business: Business;
  category: Category;
  occasions: (ProductOccasion & { occasion: Occasion })[];
};

export interface ScoredProduct {
  product: ScorableProduct;
  score: number;
  matchedLikes: string[];
  matchedOccasion: boolean;
  withinBudget: boolean;
}

/**
 * Pulls real, active products from Postgres and ranks them against the
 * parsed intent. This is the only place recommendations come from — the AI
 * provider only ever supplies `intent`, never a product list (sección 8/9).
 * The same ranking also serves as the no-AI fallback engine (sección 33):
 * category/occasion match + budget fit + popularity + rating + availability.
 */
export async function scoreProductsForIntent(
  intent: ParsedGiftIntent,
  limit = 3,
): Promise<ScoredProduct[]> {
  const candidates = (await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      business: true,
      category: true,
      occasions: { include: { occasion: true } },
    },
    take: 200,
  })) as ScorableProduct[];

  const likeTerms = intent.likes.map((like) => like.toLowerCase());
  const occasionTerm = intent.occasion?.toLowerCase();

  const scored = candidates.map((product) => {
    let score = 0;
    const matchedLikes: string[] = [];

    const searchableText = `${product.name} ${product.category.name}`.toLowerCase();
    for (const like of likeTerms) {
      if (searchableText.includes(like)) {
        score += 3;
        matchedLikes.push(like);
      }
    }

    const matchedOccasion = occasionTerm
      ? product.occasions.some((po) => po.occasion.name.toLowerCase().includes(occasionTerm))
      : false;
    if (matchedOccasion) score += 4;

    const price = Number(product.price);
    const withinBudget = intent.budgetMax === undefined || price <= intent.budgetMax;
    if (withinBudget) score += 2;
    if (intent.budgetMax !== undefined && !withinBudget) score -= 3;

    score += Math.min(product.ratingAvg, 5) * 0.6;
    score += Math.min(product.salesCount / 10, 3);
    if (product.availableToday) score += 1;

    return { product, score, matchedLikes, matchedOccasion, withinBudget };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function explainMatch(scored: ScoredProduct, intent: ParsedGiftIntent): string {
  const reasons: string[] = [];

  if (scored.withinBudget && intent.budgetMax !== undefined) {
    reasons.push("está dentro de tu presupuesto");
  }
  if (scored.matchedLikes.length > 0) {
    reasons.push(`combina ${scored.matchedLikes.slice(0, 2).join(" y ")}, que mencionaste`);
  }
  if (scored.matchedOccasion && intent.occasion) {
    reasons.push(`es ideal para ${intent.occasion}`);
  }
  if (scored.product.availableToday) {
    reasons.push("tiene entrega disponible hoy");
  }
  if (scored.product.ratingAvg >= 4) {
    reasons.push("tiene muy buenas reseñas");
  }

  if (reasons.length === 0) {
    return "Te recomendamos esta opción porque es una de las más populares de MIMO en este momento.";
  }

  return `Te recomendamos esta opción porque ${reasons.join(" y ")}.`;
}
