import { describe, expect, it } from "vitest";
import { supportRequestSchema } from "./support";

describe("supportRequestSchema", () => {
  const valid = { name: "Ana Pérez", email: "Ana@Correo.COM", message: "Tengo una duda sobre mi pedido." };

  it("acepta una consulta válida y normaliza el correo a minúsculas", () => {
    expect(supportRequestSchema.parse(valid).email).toBe("ana@correo.com");
  });

  it("rechaza un mensaje muy corto", () => {
    expect(() => supportRequestSchema.parse({ ...valid, message: "hola" })).toThrow();
  });

  it("rechaza un correo inválido", () => {
    expect(() => supportRequestSchema.parse({ ...valid, email: "no-es-correo" })).toThrow();
  });
});
