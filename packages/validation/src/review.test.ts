import { describe, expect, it } from "vitest";
import { reviewInputSchema } from "./review";

describe("reviewInputSchema", () => {
  const orderId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  it("acepta una reseña de producto con al menos una calificación", () => {
    expect(() => reviewInputSchema.parse({ orderId, productId, productRating: 5 })).not.toThrow();
  });

  it("rechaza si no se califica ningún aspecto (producto/negocio/entrega)", () => {
    expect(() => reviewInputSchema.parse({ orderId, productId })).toThrow();
  });

  it("rechaza si no se indica qué se está reseñando (ni productId ni businessId)", () => {
    expect(() => reviewInputSchema.parse({ orderId, productRating: 5 })).toThrow();
  });

  it("acepta calificar solo la entrega, sin producto ni negocio explícito — mientras venga businessId", () => {
    const businessId = crypto.randomUUID();
    expect(() => reviewInputSchema.parse({ orderId, businessId, deliveryRating: 4 })).not.toThrow();
  });

  it("rechaza calificaciones fuera de 1-5", () => {
    expect(() => reviewInputSchema.parse({ orderId, productId, productRating: 0 })).toThrow();
    expect(() => reviewInputSchema.parse({ orderId, productId, productRating: 6 })).toThrow();
  });
});
