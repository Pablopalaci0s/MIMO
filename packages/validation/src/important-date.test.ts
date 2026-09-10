import { describe, expect, it } from "vitest";
import { importantDateInputSchema } from "./important-date";

describe("importantDateInputSchema", () => {
  const valid = { type: "BIRTHDAY" as const, label: "Cumpleaños de mamá", date: "2026-05-10" };

  it("acepta datos mínimos válidos", () => {
    expect(() => importantDateInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza una fecha que no tiene formato YYYY-MM-DD", () => {
    expect(() => importantDateInputSchema.parse({ ...valid, date: "10/05/2026" })).toThrow();
    expect(() => importantDateInputSchema.parse({ ...valid, date: "2026-5-10" })).toThrow();
  });

  it("rechaza un tipo fuera del enum", () => {
    expect(() => importantDateInputSchema.parse({ ...valid, type: "NAVIDAD" })).toThrow();
  });

  it("remindDaysBefore es opcional, y si viene, se coacciona a número entre 0 y 60", () => {
    expect(importantDateInputSchema.parse(valid).remindDaysBefore).toBeUndefined();
    expect(importantDateInputSchema.parse({ ...valid, remindDaysBefore: "5" }).remindDaysBefore).toBe(5);
    expect(() => importantDateInputSchema.parse({ ...valid, remindDaysBefore: 61 })).toThrow();
    expect(() => importantDateInputSchema.parse({ ...valid, remindDaysBefore: -1 })).toThrow();
  });

  it("recipientName acepta vacío o texto", () => {
    expect(() => importantDateInputSchema.parse({ ...valid, recipientName: "" })).not.toThrow();
    expect(() => importantDateInputSchema.parse({ ...valid, recipientName: "Mamá" })).not.toThrow();
  });
});
