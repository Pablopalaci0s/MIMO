import type { ParsedGiftIntent } from "@mimo/types";

const OCCASION_KEYWORDS: Record<string, string[]> = {
  cumpleaños: ["cumpleaños", "cumple", "birthday"],
  aniversario: ["aniversario", "anniversary"],
  "día de la madre": ["día de la madre", "dia de la madre", "mamá", "mama"],
  "día del padre": ["día del padre", "dia del padre", "papá", "papa"],
  graduación: ["graduación", "graduacion", "graduation"],
  propuesta: ["propuesta", "matrimonio", "casamiento", "pedida"],
};

const LIKE_KEYWORDS = [
  "flores",
  "rosas",
  "chocolates",
  "peluche",
  "peluches",
  "globos",
  "pasteles",
  "postres",
  "café",
  "desayuno",
  "libros",
  "música",
  "deporte",
  "maquillaje",
  "beauty",
];

const PERSONALITY_KEYWORDS: Record<string, string[]> = {
  romántica: ["romántica", "romantica", "cursi", "detallista"],
  divertida: ["divertida", "chistosa", "bromista"],
  gamer: ["gamer", "videojuegos"],
  deportista: ["deportista", "gym", "fútbol", "futbol"],
  creativa: ["creativa", "arte", "dibujar"],
  beauty: ["beauty", "maquillaje", "skincare"],
  foodie: ["foodie", "comida", "postres"],
  "amante de libros": ["libros", "lectura", "leer"],
  música: ["música", "musica", "canciones"],
};

/**
 * Extrae la intención del usuario con reglas simples (sin IA) para que
 * "Ayúdame a elegir" siga funcionando cuando el proveedor de IA no está
 * disponible — ver sección 33 del spec: la IA nunca es un punto único de
 * fallo.
 */
export function parseIntentHeuristically(message: string): ParsedGiftIntent {
  const lower = message.toLowerCase();

  let occasion: string | undefined;
  for (const [name, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      occasion = name;
      break;
    }
  }

  const likes = LIKE_KEYWORDS.filter((keyword) => lower.includes(keyword));

  const personality = Object.entries(PERSONALITY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([name]) => name);

  const budgetMatch = lower.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  const budgetMax = budgetMatch ? Number.parseFloat(budgetMatch[1]) : undefined;

  const relationshipMatch = lower.match(
    /\b(novia|novio|esposa|esposo|mamá|mama|papá|papa|amiga|amigo|hermana|hermano|jefa|jefe)\b/,
  );

  return {
    recipient: relationshipMatch?.[1],
    relationship: relationshipMatch?.[1],
    occasion,
    budgetMin: undefined,
    budgetMax,
    likes,
    personality,
    location: undefined,
    date: undefined,
  };
}
