import { describe, expect, it } from "vitest";
import { favoriteToggleInputSchema } from "./favorite";

describe("favoriteToggleInputSchema", () => {
  it("acepta PRODUCT o BUSINESS", () => {
    expect(() =>
      favoriteToggleInputSchema.parse({ targetType: "PRODUCT", targetId: crypto.randomUUID() }),
    ).not.toThrow();
    expect(() =>
      favoriteToggleInputSchema.parse({ targetType: "BUSINESS", targetId: crypto.randomUUID() }),
    ).not.toThrow();
  });

  it("rechaza un targetType fuera del enum", () => {
    expect(() =>
      favoriteToggleInputSchema.parse({ targetType: "REVIEW", targetId: crypto.randomUUID() }),
    ).toThrow();
  });

  it("rechaza un targetId que no es UUID", () => {
    expect(() => favoriteToggleInputSchema.parse({ targetType: "PRODUCT", targetId: "abc" })).toThrow();
  });
});
