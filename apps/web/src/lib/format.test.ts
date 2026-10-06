import { describe, expect, it } from "vitest";
import { formatPhone, formatPreparationTime } from "./format";

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
