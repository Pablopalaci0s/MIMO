import { describe, expect, it } from "vitest";
import {
  businessDeliveryZoneInputSchema,
  businessProductImageSchema,
  businessProductInputSchema,
  businessProfileInputSchema,
} from "./business";

describe("businessProductImageSchema (imageUrlSchema)", () => {
  it("acepta una URL absoluta http(s)", () => {
    expect(() => businessProductImageSchema.parse({ url: "https://example.com/foto.png" })).not.toThrow();
    expect(() => businessProductImageSchema.parse({ url: "http://example.com/foto.png" })).not.toThrow();
  });

  it("acepta una ruta local (/uploads/...) — la que devuelve nuestro propio endpoint", () => {
    expect(() =>
      businessProductImageSchema.parse({ url: "/uploads/a1b2c3.png" }),
    ).not.toThrow();
  });

  it("rechaza una cadena vacía", () => {
    expect(() => businessProductImageSchema.parse({ url: "" })).toThrow();
  });

  it("rechaza una URL sin protocolo y sin barra inicial (ni absoluta ni local)", () => {
    expect(() => businessProductImageSchema.parse({ url: "example.com/foto.png" })).toThrow();
  });

  it("rechaza un protocolo que no sea http/https (ej. javascript:)", () => {
    expect(() => businessProductImageSchema.parse({ url: "javascript:alert(1)" })).toThrow();
  });
});

describe("businessProductInputSchema", () => {
  const valid = {
    name: "Rosa individual",
    description: "Una rosa roja fresca con tarjeta de dedicatoria incluida.",
    price: 9.99,
    categoryId: crypto.randomUUID(),
    stock: 10,
    isPersonalizable: true,
    availableToday: true,
    preparationTimeMinutes: 60,
    status: "ACTIVE" as const,
    images: [{ url: "/uploads/a.png" }],
  };

  it("acepta un producto válido", () => {
    expect(() => businessProductInputSchema.parse(valid)).not.toThrow();
  });

  it("exige al menos una imagen", () => {
    expect(() => businessProductInputSchema.parse({ ...valid, images: [] })).toThrow();
  });

  it("rechaza más de 8 imágenes", () => {
    const images = Array.from({ length: 9 }, (_, i) => ({ url: `/uploads/${i}.png` }));
    expect(() => businessProductInputSchema.parse({ ...valid, images })).toThrow();
  });

  it("coacciona precio/stock/tiempo de string a número (vienen de un <input>)", () => {
    const result = businessProductInputSchema.parse({ ...valid, price: "9.99", stock: "10" });
    expect(result.price).toBe(9.99);
    expect(result.stock).toBe(10);
  });

  it("rechaza precio negativo o cero", () => {
    expect(() => businessProductInputSchema.parse({ ...valid, price: 0 })).toThrow();
    expect(() => businessProductInputSchema.parse({ ...valid, price: -5 })).toThrow();
  });

  it("compareAtPrice es opcional y nullable", () => {
    expect(() => businessProductInputSchema.parse({ ...valid, compareAtPrice: null })).not.toThrow();
    expect(() => businessProductInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza una descripción de menos de 10 caracteres", () => {
    expect(() => businessProductInputSchema.parse({ ...valid, description: "corta" })).toThrow();
  });
});

describe("businessDeliveryZoneInputSchema", () => {
  const base = { name: "San Salvador y alrededores", deliveryFee: 3.5, estimatedMinutes: 60, isActive: true };

  it("municipalityId null representa la zona 'cualquier municipio' — debe ser válido", () => {
    expect(() => businessDeliveryZoneInputSchema.parse({ ...base, municipalityId: null })).not.toThrow();
  });

  it("municipalityId puede omitirse por completo", () => {
    expect(() => businessDeliveryZoneInputSchema.parse(base)).not.toThrow();
  });

  it("si se manda municipalityId, tiene que ser un UUID válido", () => {
    expect(() =>
      businessDeliveryZoneInputSchema.parse({ ...base, municipalityId: "no-es-uuid" }),
    ).toThrow();
  });

  it("rechaza un costo de envío negativo", () => {
    expect(() => businessDeliveryZoneInputSchema.parse({ ...base, deliveryFee: -1 })).toThrow();
  });
});

describe("businessProfileInputSchema", () => {
  it("todos los campos son opcionales — un PATCH parcial es válido", () => {
    expect(() => businessProfileInputSchema.parse({})).not.toThrow();
  });

  it("acepta phone vacío ('') además de un teléfono válido", () => {
    expect(() => businessProfileInputSchema.parse({ phone: "" })).not.toThrow();
    expect(() => businessProfileInputSchema.parse({ phone: "78991234" })).not.toThrow();
  });

  it("rechaza un teléfono con formato inválido si no está vacío", () => {
    expect(() => businessProfileInputSchema.parse({ phone: "123" })).toThrow();
  });

  it("logoUrl/coverUrl aceptan null (para 'sacar' la imagen)", () => {
    expect(() => businessProfileInputSchema.parse({ logoUrl: null, coverUrl: null })).not.toThrow();
  });
});
