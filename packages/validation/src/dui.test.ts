import { describe, expect, it } from "vitest";
import { duiLast4, duiNumberSchema, isValidDui, normalizeDui, verifyIdentitySchema } from "./dui";

describe("DUI", () => {
  it("normaliza guiones y espacios", () => {
    expect(normalizeDui("04295342-7")).toBe("042953427");
    expect(normalizeDui(" 04295342 7 ")).toBe("042953427");
  });

  it("valida el dígito verificador", () => {
    expect(isValidDui("04295342-7")).toBe(true);
    expect(isValidDui("042953427")).toBe(true);
    expect(isValidDui("00000000-0")).toBe(true);
    expect(isValidDui("04295342-8")).toBe(false); // verificador incorrecto
    expect(isValidDui("12345678-9")).toBe(false);
  });

  it("rechaza formatos que no son un DUI", () => {
    for (const bad of ["", "abc", "0429534", "0429534277", "04295342-"]) {
      expect(isValidDui(bad)).toBe(false);
    }
  });

  it("conserva solo los últimos 4 dígitos", () => {
    expect(duiLast4("04295342-7")).toBe("3427");
    expect(duiLast4("042953427")).toBe("3427");
  });

  it("el esquema explica qué está mal sin repetir el número", () => {
    const result = duiNumberSchema.safeParse("04295342-8");
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0]!.message;
      expect(message).toMatch(/verificador/);
      expect(JSON.stringify(result.error.issues)).not.toContain("04295342");
    }
  });
});

describe("verifyIdentitySchema", () => {
  const valid = {
    duiNumber: "04295342-7",
    documentLegible: true,
    documentValid: true,
    identityMatches: true,
    photoMatches: true,
  };

  it("acepta la verificación completa", () => {
    expect(verifyIdentitySchema.parse(valid).duiNumber).toBe("04295342-7");
  });

  it("no existe un registro de 'verificado' con algún criterio sin confirmar", () => {
    for (const key of ["documentLegible", "documentValid", "identityMatches", "photoMatches"] as const) {
      expect(() => verifyIdentitySchema.parse({ ...valid, [key]: false })).toThrow();
      const { [key]: _removed, ...rest } = valid;
      expect(() => verifyIdentitySchema.parse(rest)).toThrow();
    }
  });
});
