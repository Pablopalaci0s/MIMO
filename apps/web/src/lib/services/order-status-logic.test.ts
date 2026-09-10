import { describe, expect, it } from "vitest";
import { computeOrderStatus, isValidTransition } from "./order-status-logic";

describe("isValidTransition", () => {
  it("permite el camino feliz completo, paso a paso", () => {
    expect(isValidTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(isValidTransition("CONFIRMED", "PREPARING")).toBe(true);
    expect(isValidTransition("PREPARING", "OUT_FOR_DELIVERY")).toBe(true);
    expect(isValidTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("permite cancelar desde cualquier estado activo (no cerrado)", () => {
    expect(isValidTransition("PENDING", "CANCELLED")).toBe(true);
    expect(isValidTransition("CONFIRMED", "CANCELLED")).toBe(true);
    expect(isValidTransition("PREPARING", "CANCELLED")).toBe(true);
  });

  it("rechaza saltarse pasos (PENDING directo a DELIVERED)", () => {
    expect(isValidTransition("PENDING", "DELIVERED")).toBe(false);
  });

  it("no se puede cancelar un pedido que ya salió a entrega", () => {
    expect(isValidTransition("OUT_FOR_DELIVERY", "CANCELLED")).toBe(false);
  });

  it("un estado cerrado (DELIVERED/CANCELLED) no admite ninguna transición", () => {
    expect(isValidTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(isValidTransition("CANCELLED", "PENDING")).toBe(false);
  });

  it("rechaza ir para atrás (PREPARING a CONFIRMED)", () => {
    expect(isValidTransition("PREPARING", "CONFIRMED")).toBe(false);
  });
});

describe("computeOrderStatus", () => {
  it("el estado del pedido es el del ítem menos avanzado entre los activos", () => {
    expect(computeOrderStatus(["DELIVERED", "PREPARING", "CONFIRMED"])).toBe("CONFIRMED");
  });

  it("un pedido de un solo negocio refleja directamente el estado de su único ítem", () => {
    expect(computeOrderStatus(["OUT_FOR_DELIVERY"])).toBe("OUT_FOR_DELIVERY");
  });

  it("ignora los ítems cancelados al calcular el mínimo — no bloquean el progreso de los demás", () => {
    expect(computeOrderStatus(["CANCELLED", "DELIVERED"])).toBe("DELIVERED");
  });

  it("si todos los ítems se cancelan, el pedido completo queda cancelado", () => {
    expect(computeOrderStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED");
  });

  it("todos entregados → pedido entregado", () => {
    expect(computeOrderStatus(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
  });
});
