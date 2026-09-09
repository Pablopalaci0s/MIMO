import Anthropic from "@anthropic-ai/sdk";
import type { GenerateDedicationRequest, ParsedGiftIntent } from "@mimo/types";
import type { AIProvider } from "../provider";

const MODEL = "claude-opus-5";

const INTENT_SYSTEM_PROMPT = `Eres el motor de interpretación de MIMO, un marketplace salvadoreño de regalos.
Tu única tarea es leer lo que un usuario escribe sobre un regalo que quiere enviar y extraer su intención en JSON.
No sugieras productos, precios ni negocios — eso lo hace otro sistema con datos reales de la base de datos.
Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin texto extra) con esta forma exacta:
{
  "recipient": string | null,
  "relationship": string | null,
  "occasion": string | null,
  "budgetMin": number | null,
  "budgetMax": number | null,
  "likes": string[],
  "personality": string[],
  "location": string | null,
  "date": string | null
}
Si el usuario menciona un solo monto (ej. "tengo $35"), usa ese valor como budgetMax y deja budgetMin en null.`;

const DEDICATION_SYSTEM_PROMPT = `Eres el asistente de dedicatorias de MIMO, un marketplace salvadoreño de regalos.
Escribís mensajes cortos y genuinos para acompañar un regalo, en español neutro salvadoreño, sin exagerar el uso de emojis.
Responde ÚNICAMENTE con un array JSON de 3 strings (sin markdown, sin texto extra), cada uno una opción distinta de dedicatoria.`;

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    : trimmed;
  return JSON.parse(jsonText) as T;
}

function firstTextBlock(message: Anthropic.Message): string {
  const block = message.content.find((entry) => entry.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("La respuesta de Anthropic no incluyó texto");
  }
  return block.text;
}

export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeIntent(message: string): Promise<ParsedGiftIntent> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });

    const parsed = extractJson<Partial<ParsedGiftIntent>>(firstTextBlock(response));
    return {
      recipient: parsed.recipient ?? undefined,
      relationship: parsed.relationship ?? undefined,
      occasion: parsed.occasion ?? undefined,
      budgetMin: parsed.budgetMin ?? undefined,
      budgetMax: parsed.budgetMax ?? undefined,
      likes: parsed.likes ?? [],
      personality: parsed.personality ?? [],
      location: parsed.location ?? undefined,
      date: parsed.date ?? undefined,
    };
  }

  async generateDedications(request: GenerateDedicationRequest): Promise<string[]> {
    const toneLabel: Record<GenerateDedicationRequest["tone"], string> = {
      romantic: "romántico",
      funny: "divertido",
      formal: "formal",
      short: "corto y directo",
      heartfelt: "sincero y emotivo",
    };

    const userPrompt = [
      `Tono deseado: ${toneLabel[request.tone]}.`,
      request.recipientName ? `Destinatario: ${request.recipientName}.` : null,
      request.occasion ? `Ocasión: ${request.occasion}.` : null,
      request.instructions ? `Instrucciones adicionales: ${request.instructions}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { effort: "low" },
      system: DEDICATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    return extractJson<string[]>(firstTextBlock(response));
  }
}
