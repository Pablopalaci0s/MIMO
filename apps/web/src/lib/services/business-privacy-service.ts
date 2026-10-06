import { prisma } from "@mimo/database";
import { AppError } from "@/lib/errors";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal/privacy";

/**
 * Consentimiento del titular a la Política de privacidad (que incluye el uso
 * del DUI solo para verificar la identidad). Se da al registrarse; un negocio
 * que ya existía (o si la política cambia de versión) lo da desde su panel.
 * Sin consentimiento vigente no se puede subir ningún documento de identidad.
 */

export function assertCurrentPrivacyVersion(version: string): void {
  if (version !== PRIVACY_POLICY_VERSION) {
    throw new AppError(
      "PRIVACY_OUTDATED",
      "La Política de privacidad se actualizó mientras la leías. Recargá la página y revisala de nuevo.",
      409,
    );
  }
}

export async function hasAcceptedCurrentPrivacy(businessId: string): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { privacyAcceptedVersion: true },
  });
  return business?.privacyAcceptedVersion === PRIVACY_POLICY_VERSION;
}

/** Falla si el titular todavía no aceptó la política vigente. */
export async function assertPrivacyAccepted(businessId: string): Promise<void> {
  if (await hasAcceptedCurrentPrivacy(businessId)) return;
  throw new AppError(
    "PRIVACY_CONSENT_REQUIRED",
    "Antes de subir tus documentos tenés que aceptar la Política de privacidad.",
    409,
  );
}

export async function acceptPrivacyPolicy(businessId: string, version: string): Promise<void> {
  assertCurrentPrivacyVersion(version);
  await prisma.business.update({
    where: { id: businessId },
    data: { privacyAcceptedVersion: version, privacyAcceptedAt: new Date() },
  });
}
