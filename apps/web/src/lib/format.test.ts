import { describe, expect, it } from "vitest";
import { formatPhone, formatPreparationTime, whatsappHref } from "./format";

describe("formatPreparationTime", () => {
  it("minutos puros por debajo de una hora", () => {
    expect(formatPreparationTime(45)).toBe("45 min");
  });

  it("horas exactas sin minutos sueltos", () => {
    expect(formatPreparationTime(120)).toBe("2 h");
  });

  it("horas con minutos sueltos", () => {
    expect(formatPreparationTime(90)).toBe("1 h 30 min");
  });
});

describe("formatPhone", () => {
  it("formatea un teléfono salvadoreño de 8 dígitos como XXXX-XXXX", () => {
    expect(formatPhone("78991234")).toBe("7899-1234");
  });
});

describe("whatsappHref", () => {
  it("arma el link de wa.me con solo dígitos, sin importar el formato guardado", () => {
    expect(whatsappHref("+503 7899-1234")).toBe("https://wa.me/50378991234");
  });

  it("ya viene solo con dígitos", () => {
    expect(whatsappHref("50378991234")).toBe("https://wa.me/50378991234");
  });
});
