import { describe, expect, it } from "vitest";
import { coverageRequestInputSchema, deliveryCoverageCheckSchema } from "./delivery";

describe("deliveryCoverageCheckSchema", () => {
  it("acepta uno o más businessIds válidos", () => {
    expect(() =>
      deliveryCoverageCheckSchema.parse({ businessIds: [crypto.randomUUID()], municipalityId: crypto.randomUUID() }),
    ).not.toThrow();
  });

  it("rechaza una lista vacía de negocios — el carrito no puede estar vacío acá", () => {
    expect(() =>
      deliveryCoverageCheckSchema.parse({ businessIds: [], municipalityId: crypto.randomUUID() }),
    ).toThrow();
  });

  it("rechaza un businessId que no es UUID", () => {
    expect(() =>
      deliveryCoverageCheckSchema.parse({ businessIds: ["no-es-uuid"], municipalityId: crypto.randomUUID() }),
    ).toThrow();
  });
});

describe("coverageRequestInputSchema", () => {
  const base = { businessId: crypto.randomUUID(), municipalityId: crypto.randomUUID() };

  it("los datos de contacto son opcionales", () => {
    expect(() => coverageRequestInputSchema.parse(base)).not.toThrow();
  });

  it("acepta contactEmail vacío ('') o un correo real", () => {
    expect(() => coverageRequestInputSchema.parse({ ...base, contactEmail: "" })).not.toThrow();
    expect(() => coverageRequestInputSchema.parse({ ...base, contactEmail: "a@b.com" })).not.toThrow();
  });

  it("rechaza un contactEmail con formato inválido (si no está vacío)", () => {
    expect(() => coverageRequestInputSchema.parse({ ...base, contactEmail: "no-es-correo" })).toThrow();
  });
});
