import { describe, expect, it } from "vitest";
import { RESERVED_SUPPORT_USERNAMES, suggestSupportUsername, supportUsernameSchema } from "./support-ticket";

describe("nombre de usuario del personal de soporte", () => {
  it("acepta formatos válidos y los guarda en minúsculas", () => {
    expect(supportUsernameSchema.parse("ana.martinez")).toBe("ana.martinez");
    expect(supportUsernameSchema.parse("  Carlos_R  ")).toBe("carlos_r");
    expect(supportUsernameSchema.parse("lucia-h2")).toBe("lucia-h2");
    expect(supportUsernameSchema.parse("abc")).toBe("abc");
    expect(supportUsernameSchema.parse("a".repeat(24))).toHaveLength(24);
  });

  it("rechaza largo inválido, espacios, acentos, símbolos y signos al borde o repetidos", () => {
    for (const bad of ["ab", "a".repeat(25), "ana martinez", "andrés", "ana@mimo", "ana!", ".ana", "ana.", "-ana", "ana--b", "ana..b", "a_.b", "añ4", ""]) {
      expect(supportUsernameSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("rechaza los nombres reservados, también con mayúsculas", () => {
    for (const reserved of RESERVED_SUPPORT_USERNAMES) expect(supportUsernameSchema.safeParse(reserved).success, reserved).toBe(false);
    expect(supportUsernameSchema.safeParse("ADMIN").success).toBe(false);
    expect(supportUsernameSchema.safeParse("Soporte").success).toBe(false);
    // pero un nombre que solo CONTIENE una palabra reservada sí sirve
    expect(supportUsernameSchema.safeParse("ana.soporte").success).toBe(true);
  });

  it("sugiere nombre.apellido sin acentos ni signos", () => {
    expect(suggestSupportUsername("Ana Martínez")).toBe("ana.martinez");
    expect(suggestSupportUsername("José Menjívar")).toBe("jose.menjivar");
    expect(suggestSupportUsername("Ana María Hernández López")).toBe("ana.lopez");
    expect(suggestSupportUsername("Marta")).toBe("marta");
    expect(suggestSupportUsername("O'Neil Pérez-Rosa")).toBe("o.rosa");
  });

  it("la sugerencia siempre cumple las reglas, aunque el nombre no sirva", () => {
    for (const name of [null, undefined, "", "   ", "!!!", "李雷", "Admin", "A", "x".repeat(60), "Ab Cd"]) {
      const suggestion = suggestSupportUsername(name);
      expect(supportUsernameSchema.safeParse(suggestion).success, String(name)).toBe(true);
    }
    expect(suggestSupportUsername(null)).toBe("nuevo.agente");
    expect(suggestSupportUsername("Admin")).toBe("nuevo.agente");
  });

  it("recorta una sugerencia demasiado larga a 24 caracteres", () => {
    const suggestion = suggestSupportUsername("Maximiliano Montenegro-Villalobos Fernández");
    expect(suggestion.length).toBeLessThanOrEqual(24);
    expect(supportUsernameSchema.safeParse(suggestion).success).toBe(true);
  });
});
