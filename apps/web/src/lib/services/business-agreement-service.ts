import { prisma } from "@mimo/database";
import { BUSINESS_AGREEMENT_VERSION } from "@/lib/legal/business-agreement";
import { AppError } from "@/lib/errors";

/**
 * Acuerdo MIMO ↔ negocio: única fuente de lectura/escritura de las
 * constancias de aceptación. El texto vive en `/terminos-negocios`; acá solo
 * se registra QUIÉN aceptó QUÉ versión y CUÁNDO.
 */

/** Falla si la versión que el cliente mostró no es la vigente (ej. la
 * página quedó abierta mientras se publicaba una versión nueva): nunca se
 * registra una aceptación de un texto que la persona no vio. */
export function assertCurrentAgreementVersion(version: string): void {
  if (version !== BUSINESS_AGREEMENT_VERSION) {
    throw new AppError(
      "AGREEMENT_OUTDATED",
      "El acuerdo para negocios se actualizó mientras lo leías. Recargá la página y revisalo de nuevo.",
      409,
    );
  }
}

export async function hasAcceptedCurrentAgreement(businessId: string): Promise<boolean> {
  const found = await prisma.businessAgreementAcceptance.findUnique({
    where: { businessId_version: { businessId, version: BUSINESS_AGREEMENT_VERSION } },
    select: { id: true },
  });
  return found !== null;
}

/** Idempotente: aceptar dos veces la misma versión no duplica la constancia
 * ni pisa la fecha de la primera aceptación. */
export async function acceptAgreement(businessId: string, userId: string, version: string): Promise<void> {
  assertCurrentAgreementVersion(version);
  await prisma.businessAgreementAcceptance.upsert({
    where: { businessId_version: { businessId, version } },
    create: { businessId, acceptedById: userId, version },
    update: {},
  });
}

/** El admin no puede aprobar (ni reactivar) un negocio real que no aceptó el
 * acuerdo vigente. Los negocios demo (datos de ejemplo) quedan afuera. */
export async function assertCanBeApproved(business: { id: string; isDemo: boolean }): Promise<void> {
  if (business.isDemo) return;
  if (await hasAcceptedCurrentAgreement(business.id)) return;
  throw new AppError(
    "AGREEMENT_PENDING",
    "Este negocio todavía no aceptó el Acuerdo MIMO ↔ negocio vigente. Pedile que lo acepte desde su panel antes de aprobarlo.",
    409,
  );
}
