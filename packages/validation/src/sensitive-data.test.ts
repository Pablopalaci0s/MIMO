import { describe, expect, it } from "vitest";
import { CARD_MASK, DUI_MASK, redactSensitive } from "./sensitive-data";

// Números de prueba públicos de las pasarelas (no son tarjetas reales).
const VISA = "4111111111111111";
const MASTERCARD = "5555555555554444";
const AMEX = "378282246310005";

describe("DUI", () => {
  it("oculta un DUI válido con guion y sin guion, conservando el resto del mensaje", () => {
    const a = redactSensitive("Mi DUI es 04295342-7 por si lo necesitan");
    expect(a).toEqual({ text: `Mi DUI es ${DUI_MASK} por si lo necesitan`, redacted: true, kinds: ["DUI"] });

    const b = redactSensitive("dui:042953427.");
    expect(b.text).toBe(`dui:${DUI_MASK}.`);
    expect(b.kinds).toEqual(["DUI"]);
  });

  it("NO oculta un número de 9 dígitos cuyo dígito verificador es incorrecto", () => {
    expect(redactSensitive("referencia 04295342-8").redacted).toBe(false);
    expect(redactSensitive("código 123456789").redacted).toBe(false);
    expect(redactSensitive("04295342-8").text).toBe("04295342-8");
  });

  it("oculta varios en el mismo mensaje", () => {
    const result = redactSensitive("el mío 04295342-7 y el de mi hermano 00000000-0");
    expect(result.text).toBe(`el mío ${DUI_MASK} y el de mi hermano ${DUI_MASK}`);
  });

  it("no toca los números de pedido, aunque contengan dígitos que formen un DUI válido", () => {
    // 20260912-7 con verificador válido pegado a "MIMO-" → es parte del número de pedido.
    for (const order of ["MIMO-20260912-AB12C", "MIMO-20260912-7AB12", "MIMO-04295342-7ABCD", "mimo-04295342-7ab12"]) {
      const result = redactSensitive(`Mi pedido ${order} no llegó`);
      expect(result.redacted).toBe(false);
      expect(result.text).toBe(`Mi pedido ${order} no llegó`);
    }
  });

  it("no toca teléfonos, montos, fechas, años ni códigos", () => {
    for (const text of [
      "mi teléfono es 7899-1234",
      "llámenme al +503 7899 1234",
      "mi número 78991234",
      "pagué $1,234.56 el 12/10/2026",
      "el 2026-10-05 a las 10:30",
      "factura 2026100512345",
      "pedido #1042 y ticket T-1042",
      "https://mimo.sv/pedidos/042953427",
      "cupón VERANO2026 y código 12345",
    ]) {
      const result = redactSensitive(text);
      expect(result.text, text).toBe(text);
      expect(result.redacted, text).toBe(false);
    }
  });

  it("no oculta un DUI embebido dentro de un número o código más largo", () => {
    expect(redactSensitive("0429534270").redacted).toBe(false); // 10 dígitos
    expect(redactSensitive("A042953427").redacted).toBe(false); // pegado a una letra
    expect(redactSensitive("042953427B").redacted).toBe(false);
    expect(redactSensitive("+042953427").redacted).toBe(false);
  });
});

describe("tarjetas", () => {
  it("oculta tarjetas válidas (Luhn + marca conocida) contiguas, con espacios y con guiones", () => {
    expect(redactSensitive(`mi tarjeta ${VISA} venció`).text).toBe(`mi tarjeta ${CARD_MASK} venció`);
    expect(redactSensitive("4111 1111 1111 1111").text).toBe(CARD_MASK);
    expect(redactSensitive("4111-1111-1111-1111").text).toBe(CARD_MASK);
    expect(redactSensitive(MASTERCARD).kinds).toEqual(["CARD"]);
    expect(redactSensitive("5555 5555 5555 4444").text).toBe(CARD_MASK);
    expect(redactSensitive(AMEX).text).toBe(CARD_MASK);
    expect(redactSensitive("3782 822463 10005").text).toBe(CARD_MASK); // agrupado Amex 4-6-5
  });

  it("NO oculta números de 16 dígitos que no pasan Luhn", () => {
    expect(redactSensitive("4111111111111112").redacted).toBe(false);
    expect(redactSensitive("5555 5555 5555 4445").redacted).toBe(false);
  });

  it("NO oculta números que pasan Luhn pero no son de una marca conocida", () => {
    // 16 dígitos válidos por Luhn pero con prefijo 9 (ninguna marca)
    expect(redactSensitive("9999999999999995").redacted).toBe(false);
  });

  it("NO oculta timestamps, números largos ni agrupados raros", () => {
    for (const text of [
      "ts 1696512345678", // 13 dígitos, epoch en ms
      "id 12345678901234567",
      "NIT 0614-010190-101-3",
      "4111 11111 111 1111", // agrupado que no es de tarjeta
      "4111 1111-1111 1111", // separadores mezclados
    ]) {
      expect(redactSensitive(text).redacted, text).toBe(false);
    }
  });

  it("una tarjeta pegada a letras o dentro de un código no se toca", () => {
    expect(redactSensitive(`ref${VISA}`).redacted).toBe(false);
    expect(redactSensitive(`${VISA}x`).redacted).toBe(false);
    expect(redactSensitive(`MIMO-${VISA}`).redacted).toBe(false);
  });
});

describe("combinaciones y propiedades", () => {
  it("oculta DUI y tarjeta en el mismo mensaje y reporta ambos tipos", () => {
    const result = redactSensitive(`DUI 04295342-7 y tarjeta ${VISA}`);
    expect(result.text).toBe(`DUI ${DUI_MASK} y tarjeta ${CARD_MASK}`);
    expect([...result.kinds].sort()).toEqual(["CARD", "DUI"]);
  });

  it("es idempotente: un texto ya enmascarado no cambia", () => {
    const once = redactSensitive(`DUI 04295342-7 y ${VISA}`).text;
    const twice = redactSensitive(once);
    expect(twice.text).toBe(once);
    expect(twice.redacted).toBe(false);
  });

  it("un mensaje normal pasa intacto", () => {
    const text = "Hola, quiero cambiar la dirección de entrega de mi pedido MIMO-20260912-AB12C para el viernes.";
    expect(redactSensitive(text)).toEqual({ text, redacted: false, kinds: [] });
  });

  it("el resultado nunca contiene el valor original", () => {
    const original = "mi dui 04295342-7 y tarjeta 4111 1111 1111 1111";
    const serialized = JSON.stringify(redactSensitive(original));
    expect(serialized).not.toContain("04295342");
    expect(serialized).not.toContain("042953427");
    expect(serialized).not.toContain("4111");
  });

  it("conserva saltos de línea y espacios del resto del mensaje", () => {
    expect(redactSensitive("línea 1\n04295342-7\nlínea 3").text).toBe(`línea 1\n${DUI_MASK}\nlínea 3`);
  });
});
