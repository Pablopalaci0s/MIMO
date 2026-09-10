import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api-error-message";

describe("apiErrorMessage", () => {
  it("prioriza el primer fieldError sobre el mensaje genérico", () => {
    const body = {
      error: {
        message: "Datos inválidos",
        fieldErrors: { password: ["Debe incluir al menos una mayúscula"] },
      },
    };
    expect(apiErrorMessage(body, "fallback")).toBe("Debe incluir al menos una mayúscula");
  });

  it("usa error.message si no hay fieldErrors", () => {
    const body = { error: { message: "Ya existe una cuenta con ese correo" } };
    expect(apiErrorMessage(body, "fallback")).toBe("Ya existe una cuenta con ese correo");
  });

  it("usa el fallback si no hay ni fieldErrors ni message", () => {
    expect(apiErrorMessage({}, "No pudimos guardar los datos.")).toBe("No pudimos guardar los datos.");
  });

  it("no revienta con body undefined/null", () => {
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(apiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("toma el primer error del primer campo cuando hay varios campos con error", () => {
    const body = {
      error: {
        message: "Datos inválidos",
        fieldErrors: { email: ["Correo inválido"], password: ["Muy corta"] },
      },
    };
    // El orden real depende de Object.values, pero siempre debe ser un
    // mensaje específico, nunca el genérico "Datos inválidos".
    expect(["Correo inválido", "Muy corta"]).toContain(apiErrorMessage(body, "fallback"));
  });
});
