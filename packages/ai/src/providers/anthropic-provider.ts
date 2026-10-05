import Anthropic from "@anthropic-ai/sdk";
import type { GenerateDedicationRequest, ParsedGiftIntent } from "@mimo/types";
import { AIRefusalError, type AIProvider, type ConverseRequest, type ConverseResult } from "../provider";

const MODEL = "claude-opus-5";

/**
 * El chat de soporte puede usar otro modelo que el resto de la IA del
 * producto (ej. uno más barato/rápido, dado que cada mensaje de cada
 * visitante pasa por acá) sin tocar código — por defecto, el mismo.
 */
const CHAT_MODEL = process.env.SUPPORT_AI_MODEL?.trim() || MODEL;

/** `output_config.effort` lo rechaza la API en modelos viejos (ej. Haiku
 * 4.5, Sonnet 4.5) — solo se manda donde está soportado. */
function supportsEffort(model: string): boolean {
  return /^claude-(opus-(4-[6-9]|5)|sonnet-(4-6|5)|fable)/.test(model);
}

const DEFAULT_MAX_TOOL_ROUNDS = 5;

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

  /** `client` solo se pasa en tests (un cliente falso con respuestas armadas). */
  constructor(apiKey: string, client: Anthropic = new Anthropic({ apiKey })) {
    this.client = client;
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

  /**
   * Conversación con herramientas (bucle manual a propósito, no el tool
   * runner del SDK): acá cada paso importa — se corta a las N rondas, un
   * error de herramienta vuelve al modelo como `is_error` en vez de tumbar
   * la conversación, y un rechazo del proveedor se distingue de un fallo
   * técnico para que quien llama pueda pasar a una persona.
   */
  async converse(request: ConverseRequest): Promise<ConverseResult> {
    const messages: Anthropic.MessageParam[] = request.messages.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
    const tools: Anthropic.Tool[] = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
    const maxRounds = request.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;

    for (let round = 0; round <= maxRounds; round++) {
      const response = await this.client.messages.create(
        {
          model: CHAT_MODEL,
          max_tokens: 4096,
          ...(supportsEffort(CHAT_MODEL) ? { output_config: { effort: "low" as const } } : {}),
          system: [
            { type: "text", text: request.system, cache_control: { type: "ephemeral" } },
            { type: "text", text: request.context },
          ],
          tools,
          messages,
        },
        // Un cliente esperando una respuesta no puede aguantar el timeout
        // por defecto (10 min) ni reintentos en cadena.
        { timeout: 45_000, maxRetries: 1 },
      );

      if (response.stop_reason === "refusal") throw new AIRefusalError();

      if (response.stop_reason === "tool_use") {
        // Se devuelve el contenido completo (incluye los bloques de
        // pensamiento) — el modelo los necesita de vuelta intactos.
        messages.push({ role: "assistant", content: response.content });

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          try {
            const output = await request.executeTool(block.name, block.input);
            results.push({ type: "tool_result", tool_use_id: block.id, content: output });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            results.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: ${message}`,
              is_error: true,
            });
          }
        }
        messages.push({ role: "user", content: results });
        continue;
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (!text) throw new Error("La respuesta de Anthropic no incluyó texto");
      return { text };
    }

    throw new Error(`El modelo no terminó después de ${maxRounds} rondas de herramientas`);
  }
}
