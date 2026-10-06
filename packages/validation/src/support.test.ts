import { describe, expect, it } from "vitest";
import {
  supportEscalateSchema,
  supportRateSchema,
  supportRequestSchema,
  supportSendMessageSchema,
} from "./support";

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("supportSendMessageSchema", () => {
  it("acepta un mensaje solo (conversación nueva)", () => {
    expect(() => supportSendMessageSchema.parse({ message: "Hola" })).not.toThrow();
  });

  it("recorta espacios y rechaza un mensaje vacío", () => {
    expect(supportSendMessageSchema.parse({ message: "  hola  " }).message).toBe("hola");
    expect(() => supportSendMessageSchema.parse({ message: "   " })).toThrow();
  });

  it("rechaza mensajes de más de 1000 caracteres", () => {
    expect(() => supportSendMessageSchema.parse({ message: "a".repeat(1001) })).toThrow();
  });

  it("rechaza un conversationId que no es uuid", () => {
    expect(() => supportSendMessageSchema.parse({ message: "hola", conversationId: "abc" })).toThrow();
  });

  it("solo acepta rutas internas en pagePath", () => {
    expect(() => supportSendMessageSchema.parse({ message: "hola", pagePath: "/checkout" })).not.toThrow();
    expect(() => supportSendMessageSchema.parse({ message: "hola", pagePath: "https://evil.com" })).toThrow();
    expect(() => supportSendMessageSchema.parse({ message: "hola", pagePath: "/a b" })).toThrow();
  });
});

describe("supportEscalateSchema", () => {
  it("normaliza el correo a minúsculas", () => {
    const parsed = supportEscalateSchema.parse({ guestName: "Ana", guestEmail: " ANA@Correo.com " });
    expect(parsed.guestEmail).toBe("ana@correo.com");
  });

  it("rechaza un correo inválido", () => {
    expect(() => supportEscalateSchema.parse({ guestEmail: "no-es-correo" })).toThrow();
  });

  it("acepta escalar sin ningún dato (usuario con cuenta)", () => {
    expect(() => supportEscalateSchema.parse({})).not.toThrow();
  });
});

describe("supportRateSchema", () => {
  it("acepta calificaciones de 1 a 5 (también como string)", () => {
    expect(supportRateSchema.parse({ conversationId: UUID, rating: "4" }).rating).toBe(4);
  });

  it("rechaza 0, 6 y decimales", () => {
    for (const rating of [0, 6, 2.5]) {
      expect(() => supportRateSchema.parse({ conversationId: UUID, rating })).toThrow();
    }
  });
});

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
