/**
 * Lógica pura de "qué zona de entrega le toca a cada negocio" — sin Prisma,
 * para poder testearla sin base de datos. Compartida por
 * `delivery-coverage-service.ts` (chequeo del checkout) y
 * `order-service.ts` (validación de respaldo al crear el pedido), que antes
 * tenían cada uno su propia versión de este cálculo y se habían desincronizado.
 *
 * Una `DeliveryZone` con `municipalityId: null` es la opción "cualquier
 * municipio" (ver `zones-manager.tsx`) — un negocio puede tener a la vez una
 * zona específica para un municipio y una zona genérica de respaldo. Si hay
 * las dos, gana la específica (más precisa); si hay varias igual de
 * específicas, gana la más barata.
 */
export interface ZoneCandidate {
  businessId: string;
  municipalityId: string | null;
  deliveryFee: number;
  estimatedMinutes: number;
}

function isMoreSpecific(a: ZoneCandidate, b: ZoneCandidate): boolean {
  const aSpecific = a.municipalityId !== null;
  const bSpecific = b.municipalityId !== null;
  if (aSpecific !== bSpecific) return aSpecific && !bSpecific;
  return a.deliveryFee < b.deliveryFee;
}

/** De todas las zonas activas de un negocio que aplican a un municipio
 * (la específica de ese municipio + cualquier zona "cualquier municipio"),
 * devuelve la mejor una por negocio. */
export function pickBestZonePerBusiness<T extends ZoneCandidate>(zones: T[]): Map<string, T> {
  const best = new Map<string, T>();
  for (const zone of zones) {
    const current = best.get(zone.businessId);
    if (!current || isMoreSpecific(zone, current)) {
      best.set(zone.businessId, zone);
    }
  }
  return best;
}

export interface CoverageResolution {
  feeByBusiness: Map<string, { deliveryFee: number; estimatedMinutes: number }>;
  uncoveredBusinessIds: string[];
}

/** Dado el universo de negocios del carrito y las zonas candidatas
 * (ya filtradas por municipio exacto O null), separa quién tiene cobertura
 * de quién no — sin fee por defecto para el que no tiene zona. */
export function resolveDeliveryCoverage(businessIds: string[], zones: ZoneCandidate[]): CoverageResolution {
  const bestZones = pickBestZonePerBusiness(zones);
  const feeByBusiness = new Map<string, { deliveryFee: number; estimatedMinutes: number }>();
  const uncoveredBusinessIds: string[] = [];

  for (const businessId of businessIds) {
    const zone = bestZones.get(businessId);
    if (zone) {
      feeByBusiness.set(businessId, { deliveryFee: zone.deliveryFee, estimatedMinutes: zone.estimatedMinutes });
    } else {
      uncoveredBusinessIds.push(businessId);
    }
  }

  return { feeByBusiness, uncoveredBusinessIds };
}

/** Total de envío del carrito multi-tienda: suma el fee de cada negocio
 * cubierto. Llamar solo después de confirmar que `uncoveredBusinessIds`
 * está vacío. */
export function sumDeliveryFees(businessIds: string[], feeByBusiness: CoverageResolution["feeByBusiness"]): number {
  return businessIds.reduce((sum, businessId) => sum + (feeByBusiness.get(businessId)?.deliveryFee ?? 0), 0);
}
