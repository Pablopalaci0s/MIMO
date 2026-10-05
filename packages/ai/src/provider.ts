import type { ParsedGiftIntent } from "@mimo/types";
import type { GenerateDedicationRequest } from "@mimo/types";

/** Herramienta que el modelo puede pedir ejecutar durante una conversación. */
export interface ConverseTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
}

export interface ConverseTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ConverseRequest {
  /** Parte estable del prompt (rol, reglas, base de conocimiento) — es la
   * que se cachea, así que no debe cambiar entre mensajes. */
  system: string;
  /** Contexto que sí cambia por conversación (quién escribe, desde qué
   * página, etc.) — va después del corte de caché a propósito. */
  context: string;
  messages: ConverseTurn[];
  tools: ConverseTool[];
  /**
   * Ejecuta una herramienta y devuelve el resultado como texto para el
   * modelo. Si lanza, el modelo recibe el error y puede explicárselo al
   * usuario — nunca se interrumpe la conversación por una herramienta.
   * La autorización (qué datos puede ver este usuario) es responsabilidad
   * de quien implementa esta función, no del modelo.
   */
  executeTool(name: string, input: unknown): Promise<string>;
  maxToolRounds?: number;
}

export interface ConverseResult {
  text: string;
}

/** El proveedor se negó a responder (clasificadores de seguridad). */
export class AIRefusalError extends Error {
  constructor() {
    super("El proveedor de IA rechazó la solicitud");
    this.name = "AIRefusalError";
  }
}

/**
 * Contract every AI provider must satisfy. AIService depends only on this
 * interface, so swapping Anthropic for another provider later never touches
 * callers (route handlers, components) — see section 32 of the product spec.
 */
export interface AIProvider {
  analyzeIntent(message: string): Promise<ParsedGiftIntent>;
  generateDedications(request: GenerateDedicationRequest): Promise<string[]>;
  converse(request: ConverseRequest): Promise<ConverseResult>;
}
