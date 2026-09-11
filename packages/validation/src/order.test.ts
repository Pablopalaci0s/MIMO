import { describe, expect, it } from "vitest";
import { cartItemInputSchema, checkoutAddressSchema, checkoutInputSchema } from "./order";

describe("cartItemInputSchema", () => {
  it("acepta cantidad entre 1 y 20", () => {
    expect(() => cartItemInputSchema.parse({ productId: crypto.randomUUID(), quantity: 1 })).not.toThrow();
    expect(() => cartItemInputSchema.parse({ productId: crypto.randomUUID(), quantity: 20 })).not.toThrow();
  });

  it("rechaza cantidad 0 o mayor a 20", () => {
    expect(() => cartItemInputSchema.parse({ productId: crypto.randomUUID(), quantity: 0 })).toThrow();
    expect(() => cartItemInputSchema.parse({ productId: crypto.randomUUID(), quantity: 21 })).toThrow();
  });

  it("rechaza cantidades no enteras (medio producto no existe)", () => {
    expect(() => cartItemInputSchema.parse({ productId: crypto.randomUUID(), quantity: 1.5 })).toThrow();
  });

  it("rechaza un productId que no es UUID", () => {
    expect(() => cartItemInputSchema.parse({ productId: "abc", quantity: 1 })).toThrow();
  });
});

describe("checkoutAddressSchema", () => {
  const valid = {
    recipientName: "Ana López",
    recipientPhone: "78991234",
    addressLine: "Calle Los Almendros #12",
    municipalityId: crypto.randomUUID(),
    deliveryDate: "2026-12-25",
    deliveryWindow: "ASAP" as const,
  };

  it("acepta una dirección válida", () => {
    expect(() => checkoutAddressSchema.parse(valid)).not.toThrow();
  });

  it("rechaza una fecha de entrega que no es una fecha real", () => {
    expect(() => checkoutAddressSchema.parse({ ...valid, deliveryDate: "no-es-una-fecha" })).toThrow();
  });

  it("rechaza una ventana de entrega fuera del enum", () => {
    expect(() => checkoutAddressSchema.parse({ ...valid, deliveryWindow: "MADRUGADA" })).toThrow();
  });

  it("reference e instrucciones son opcionales", () => {
    expect(() => checkoutAddressSchema.parse(valid)).not.toThrow();
  });
});

describe("checkoutInputSchema", () => {
  const validItem = { productId: crypto.randomUUID(), quantity: 1 };
  const validAddress = {
    recipientName: "Ana López",
    recipientPhone: "78991234",
    addressLine: "Calle Los Almendros #12",
    municipalityId: crypto.randomUUID(),
    deliveryDate: "2026-12-25",
    deliveryWindow: "ASAP" as const,
  };
  const valid = {
    buyerName: "Cliente Demo",
    buyerEmail: "cliente@mimo.sv",
    buyerPhone: "78991234",
    items: [validItem],
    address: validAddress,
    isSurpriseMode: false,
    hideBuyerFromRecipient: false,
    paymentProvider: "CASH" as const,
  };

  it("acepta un checkout válido con un solo ítem", () => {
    expect(() => checkoutInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza un carrito vacío", () => {
    expect(() => checkoutInputSchema.parse({ ...valid, items: [] })).toThrow();
  });

  it("acepta CARD/OTHER a nivel de esquema — el rechazo real es en el servicio, no acá", () => {
    for (const paymentProvider of ["CARD", "OTHER"] as const) {
      expect(() => checkoutInputSchema.parse({ ...valid, paymentProvider })).not.toThrow();
    }
  });

  it("rechaza un método de pago fuera del enum conocido", () => {
    expect(() => checkoutInputSchema.parse({ ...valid, paymentProvider: "BITCOIN" })).toThrow();
  });

  it("PAYPAL requiere paypalOrderId (la orden ya aprobada por el comprador)", () => {
    expect(() => checkoutInputSchema.parse({ ...valid, paymentProvider: "PAYPAL" })).toThrow();
    expect(() =>
      checkoutInputSchema.parse({ ...valid, paymentProvider: "PAYPAL", paypalOrderId: "5O190127TN364715T" }),
    ).not.toThrow();
  });
});
