import { describe, expect, it } from "vitest";
import { generateDedicationInputSchema, recommendGiftsInputSchema } from "./ai";

describe("recommendGiftsInputSchema", () => {
  it("acepta un mensaje y sessionId válidos, personality es opcional", () => {
    expect(() =>
      recommendGiftsInputSchema.parse({ message: "Algo para mi novia", sessionId: "abc123" }),
    ).not.toThrow();
  });

  it("rechaza un mensaje demasiado corto", () => {
    expect(() => recommendGiftsInputSchema.parse({ message: "hi", sessionId: "abc" })).toThrow();
  });

  it("rechaza un sessionId vacío", () => {
    expect(() => recommendGiftsInputSchema.parse({ message: "Algo lindo", sessionId: "" })).toThrow();
  });
});

describe("generateDedicationInputSchema", () => {
  it("acepta solo el tono, el resto es opcional", () => {
    expect(() => generateDedicationInputSchema.parse({ tone: "romantic" })).not.toThrow();
  });

  it("rechaza un tono fuera del enum", () => {
    expect(() => generateDedicationInputSchema.parse({ tone: "aggressive" })).toThrow();
  });
});
