import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { AIRefusalError, type ConverseRequest } from "../provider";
import { AnthropicProvider } from "./anthropic-provider";

/**
 * No hay una API key en CI ni en desarrollo para ejercitar el bucle contra
 * Anthropic de verdad, así que acá se prueba la lógica del bucle (que es
 * nuestra, no del SDK) con un cliente falso que devuelve respuestas armadas.
 */
type Create = (params: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;

function fakeProvider(responses: unknown[]) {
  const queue = [...responses];
  const create = vi.fn<Create>(async () => {
    const next = queue.shift();
    if (!next) throw new Error("el modelo falso se quedó sin respuestas");
    return next;
  });
  const client = { messages: { create } } as unknown as Anthropic;
  return { provider: new AnthropicProvider("clave-falsa", client), create };
}

const text = (value: string) => ({ type: "text", text: value });
const toolUse = (id: string, name: string, input: unknown) => ({ type: "tool_use", id, name, input });
const message = (stopReason: string, content: unknown[]) => ({ stop_reason: stopReason, content });

function baseRequest(overrides: Partial<ConverseRequest> = {}): ConverseRequest {
  return {
    system: "SISTEMA",
    context: "CONTEXTO",
    messages: [{ role: "user", content: "hola" }],
    tools: [
      {
        name: "buscar",
        description: "busca",
        inputSchema: { type: "object", properties: { q: { type: "string" } }, additionalProperties: false },
      },
    ],
    executeTool: vi.fn(async () => "ok"),
    ...overrides,
  };
}

describe("AnthropicProvider.converse", () => {
  it("devuelve el texto cuando el modelo responde sin usar herramientas", async () => {
    const { provider } = fakeProvider([message("end_turn", [text("  Hola, ¿en qué te ayudo?  ")])]);
    await expect(provider.converse(baseRequest())).resolves.toEqual({ text: "Hola, ¿en qué te ayudo?" });
  });

  it("ejecuta TODAS las herramientas pedidas y devuelve los resultados juntos en un solo mensaje", async () => {
    const thinking = { type: "thinking", thinking: "", signature: "firma" };
    const firstContent = [
      thinking,
      text("Voy a buscar"),
      toolUse("t1", "buscar", { q: "rosas" }),
      toolUse("t2", "buscar", { q: "chocolates" }),
    ];
    const { provider, create } = fakeProvider([message("tool_use", firstContent), message("end_turn", [text("Listo")])]);
    const executeTool = vi.fn(async (_name: string, input: unknown) => `resultado:${JSON.stringify(input)}`);

    const result = await provider.converse(baseRequest({ executeTool }));

    expect(result.text).toBe("Listo");
    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenNthCalledWith(1, "buscar", { q: "rosas" });
    expect(executeTool).toHaveBeenNthCalledWith(2, "buscar", { q: "chocolates" });

    const secondCall = create.mock.calls[1]![0] as { messages: { role: string; content: unknown }[] };
    const [, assistantTurn, toolResultsTurn] = secondCall.messages;
    // El contenido del asistente vuelve completo (con el bloque de pensamiento), no solo el texto.
    expect(assistantTurn).toEqual({ role: "assistant", content: firstContent });
    expect(toolResultsTurn!.role).toBe("user");
    expect(toolResultsTurn!.content).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: 'resultado:{"q":"rosas"}' },
      { type: "tool_result", tool_use_id: "t2", content: 'resultado:{"q":"chocolates"}' },
    ]);
  });

  it("si una herramienta falla, el modelo recibe el error y la conversación sigue", async () => {
    const { provider, create } = fakeProvider([
      message("tool_use", [toolUse("t1", "buscar", { q: "x" })]),
      message("end_turn", [text("No pude buscar, ¿probamos otra cosa?")]),
    ]);
    const executeTool = vi.fn(async () => {
      throw new Error("base de datos caída");
    });

    const result = await provider.converse(baseRequest({ executeTool }));

    expect(result.text).toContain("No pude buscar");
    const secondCall = create.mock.calls[1]![0] as { messages: { content: unknown }[] };
    expect(secondCall.messages[2]!.content).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: "Error: base de datos caída", is_error: true },
    ]);
  });

  it("lanza AIRefusalError si el proveedor rechaza la solicitud", async () => {
    const { provider } = fakeProvider([message("refusal", [])]);
    await expect(provider.converse(baseRequest())).rejects.toBeInstanceOf(AIRefusalError);
  });

  it("corta el bucle si el modelo no termina de pedir herramientas", async () => {
    const endless = Array.from({ length: 10 }, () => message("tool_use", [toolUse("t", "buscar", { q: "x" })]));
    const { provider, create } = fakeProvider(endless);

    await expect(provider.converse(baseRequest({ maxToolRounds: 2 }))).rejects.toThrow(/2 rondas/);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("falla si la respuesta final no trae texto", async () => {
    const { provider } = fakeProvider([message("end_turn", [])]);
    await expect(provider.converse(baseRequest())).rejects.toThrow(/no incluyó texto/);
  });

  it("cachea solo la parte estable del prompt y manda las herramientas con su esquema", async () => {
    const { provider, create } = fakeProvider([message("end_turn", [text("ok")])]);
    await provider.converse(baseRequest());

    const [params, options] = create.mock.calls[0]!;
    const system = (params as { system: { text: string; cache_control?: unknown }[] }).system;
    expect(system[0]).toMatchObject({ text: "SISTEMA", cache_control: { type: "ephemeral" } });
    // El contexto cambia por conversación: va después del corte de caché y sin cache_control.
    expect(system[1]).toEqual({ type: "text", text: "CONTEXTO" });
    expect((params as { tools: unknown[] }).tools).toEqual([
      {
        name: "buscar",
        description: "busca",
        input_schema: { type: "object", properties: { q: { type: "string" } }, additionalProperties: false },
      },
    ]);
    // Un cliente esperando no puede aguantar el timeout por defecto de 10 minutos.
    expect(options).toMatchObject({ timeout: 45_000, maxRetries: 1 });
  });

  it("no manda parámetros de muestreo (los modelos nuevos los rechazan con 400)", async () => {
    const { provider, create } = fakeProvider([message("end_turn", [text("ok")])]);
    await provider.converse(baseRequest());
    const params = create.mock.calls[0]![0];
    for (const forbidden of ["temperature", "top_p", "top_k", "budget_tokens", "tool_choice"]) {
      expect(params).not.toHaveProperty(forbidden);
    }
  });
});
