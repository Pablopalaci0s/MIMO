import { describe, expect, it } from "vitest";
import { pickBestZonePerBusiness, resolveDeliveryCoverage, sumDeliveryFees } from "./delivery-coverage-logic";

const businessA = "biz-a";
const businessB = "biz-b";

describe("pickBestZonePerBusiness", () => {
  it("una zona específica del municipio le gana a una zona 'cualquier municipio' del mismo negocio", () => {
    // Este es el bug real que motivó extraer este módulo: antes, la
    // consulta a Prisma ni siquiera traía las zonas con municipalityId
    // null, así que "cualquier municipio" no funcionaba nunca.
    const zones = [
      { businessId: businessA, municipalityId: null, deliveryFee: 1, estimatedMinutes: 90 },
      { businessId: businessA, municipalityId: "san-salvador", deliveryFee: 5, estimatedMinutes: 40 },
    ];
    const best = pickBestZonePerBusiness(zones);
    expect(best.get(businessA)?.municipalityId).toBe("san-salvador");
  });

  it("entre dos zonas igual de específicas, gana la más barata", () => {
    const zones = [
      { businessId: businessA, municipalityId: "san-salvador", deliveryFee: 5, estimatedMinutes: 40 },
      { businessId: businessA, municipalityId: "san-salvador", deliveryFee: 3, estimatedMinutes: 60 },
    ];
    const best = pickBestZonePerBusiness(zones);
    expect(best.get(businessA)?.deliveryFee).toBe(3);
  });

  it("un negocio sin ninguna zona candidata no aparece en el resultado", () => {
    const best = pickBestZonePerBusiness([
      { businessId: businessA, municipalityId: "san-salvador", deliveryFee: 5, estimatedMinutes: 40 },
    ]);
    expect(best.has(businessB)).toBe(false);
  });

  it("una zona 'cualquier municipio' sola sí cubre — el bug era que nunca llegaba, no que se ignorara a propósito", () => {
    const best = pickBestZonePerBusiness([
      { businessId: businessA, municipalityId: null, deliveryFee: 4, estimatedMinutes: 90 },
    ]);
    expect(best.get(businessA)?.deliveryFee).toBe(4);
  });

  it("resuelve cada negocio de forma independiente", () => {
    const zones = [
      { businessId: businessA, municipalityId: "san-salvador", deliveryFee: 5, estimatedMinutes: 40 },
      { businessId: businessB, municipalityId: null, deliveryFee: 2, estimatedMinutes: 90 },
    ];
    const best = pickBestZonePerBusiness(zones);
    expect(best.get(businessA)?.businessId).toBe(businessA);
    expect(best.get(businessB)?.businessId).toBe(businessB);
  });
});

describe("resolveDeliveryCoverage", () => {
  it("separa negocios cubiertos de no cubiertos — sin fee por defecto para estos últimos", () => {
    const { feeByBusiness, uncoveredBusinessIds } = resolveDeliveryCoverage(
      [businessA, businessB],
      [{ businessId: businessA, municipalityId: "san-salvador", deliveryFee: 3.5, estimatedMinutes: 51 }],
    );
    expect(feeByBusiness.get(businessA)).toEqual({ deliveryFee: 3.5, estimatedMinutes: 51 });
    expect(uncoveredBusinessIds).toEqual([businessB]);
  });

  it("con cero zonas, todos los negocios del carrito quedan sin cobertura", () => {
    const { uncoveredBusinessIds } = resolveDeliveryCoverage([businessA, businessB], []);
    expect(uncoveredBusinessIds).toEqual([businessA, businessB]);
  });

  it("un carrito de un solo negocio cubierto no reporta ningún faltante", () => {
    const { uncoveredBusinessIds } = resolveDeliveryCoverage(
      [businessA],
      [{ businessId: businessA, municipalityId: null, deliveryFee: 2, estimatedMinutes: 80 }],
    );
    expect(uncoveredBusinessIds).toEqual([]);
  });
});

describe("sumDeliveryFees", () => {
  it("suma el fee de cada negocio del carrito multi-tienda", () => {
    const feeByBusiness = new Map([
      [businessA, { deliveryFee: 3.5, estimatedMinutes: 40 }],
      [businessB, { deliveryFee: 2.25, estimatedMinutes: 60 }],
    ]);
    expect(sumDeliveryFees([businessA, businessB], feeByBusiness)).toBeCloseTo(5.75);
  });

  it("un negocio sin entrada en el mapa no suma nada (no revienta)", () => {
    const feeByBusiness = new Map([[businessA, { deliveryFee: 3.5, estimatedMinutes: 40 }]]);
    expect(sumDeliveryFees([businessA, businessB], feeByBusiness)).toBe(3.5);
  });
});
