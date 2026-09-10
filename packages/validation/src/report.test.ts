import { describe, expect, it } from "vitest";
import { reportInputSchema } from "./report";

describe("reportInputSchema", () => {
  const valid = { targetType: "PRODUCT" as const, targetId: crypto.randomUUID(), reason: "Info falsa" };

  it("acepta un reporte válido sin descripción (opcional)", () => {
    expect(() => reportInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza un motivo de menos de 3 caracteres", () => {
    expect(() => reportInputSchema.parse({ ...valid, reason: "ab" })).toThrow();
  });

  it("acepta los 4 tipos de destino", () => {
    for (const targetType of ["PRODUCT", "BUSINESS", "REVIEW", "USER"] as const) {
      expect(() => reportInputSchema.parse({ ...valid, targetType })).not.toThrow();
    }
  });
});
