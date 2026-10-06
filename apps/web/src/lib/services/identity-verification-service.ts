import { createHmac } from "node:crypto";
import { prisma } from "@mimo/database";
import type { IdentityVerificationDTO } from "@mimo/types";
import { duiLast4, isValidDui, normalizeDui, type VerifyIdentityInput } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { DOCUMENT_RETENTION_VERIFIED_DAYS, IDENTITY_IMAGE_TYPES } from "@/lib/legal/privacy";
import { logAdminAction } from "./admin-audit-service";
import { updateAdminBusiness } from "./admin-business-service";
import { assertCanBeApproved } from "./business-agreement-service";

/**
 * Verificación de identidad del titular de un negocio.
 *
 * Qué se conserva a largo plazo de un DUI: NADA de su número completo. Solo
 * los últimos 4 dígitos y una HMAC-SHA256 con un secreto del servidor, que
 * sirve para detectar que la misma persona se registra de nuevo. Las imágenes
 * (frente, reverso, selfie) se borran `DOCUMENT_RETENTION_VERIFIED_DAYS` días
 * después (ver `lib/legal/privacy.ts`: plazo PROVISIONAL, a validar con un
 * abogado) — ese borrado lo hace `purgeVerifiedIdentityImages`.
 *
 * El número completo entra a `verifyIdentity` por parámetro, se usa para sacar
 * los 4 dígitos y la huella, y se descarta: nunca se escribe en la base, en la
 * auditoría, en una notificación ni en un log, ni se incluye en un mensaje de
 * error.
 */

/** Versión de la huella: si algún día se rota el secreto o cambia la
 * construcción, las huellas viejas se reconocen por este número. */
export const DUI_FINGERPRINT_VERSION = 1;

const MIN_SECRET_LENGTH = 32;

/**
 * HMAC-SHA256 del DUI (solo dígitos), con `DUI_FINGERPRINT_SECRET`.
 * Un SHA-256 simple NO sirve: hay ~10^8 DUI posibles y se recorrerían todos
 * en minutos para recuperar el número; con la HMAC hace falta el secreto.
 * Sin el secreto configurado falla en vez de usar uno por defecto.
 */
export function computeDuiFingerprint(duiNumber: string, secret: string | undefined = process.env.DUI_FINGERPRINT_SECRET): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new AppError(
      "FINGERPRINT_NOT_CONFIGURED",
      "Falta configurar DUI_FINGERPRINT_SECRET (mínimo 32 caracteres) en el servidor para poder verificar identidades.",
      503,
    );
  }
  const digits = normalizeDui(duiNumber);
  return createHmac("sha256", secret).update(`dui:v${DUI_FINGERPRINT_VERSION}:${digits}`).digest("hex");
}

export interface DuplicateIdentityMatch {
  businessId: string;
  businessName: string;
  businessStatus: string;
}

export type VerifyIdentityResult =
  | { requiresConfirmation: true; duplicates: DuplicateIdentityMatch[] }
  | { requiresConfirmation: false; verification: IdentityVerificationDTO; approved: boolean };

const VERIFICATION_INCLUDE = { verifiedBy: { select: { name: true } } } as const;

function toDTO(row: {
  id: string;
  verifiedAt: Date;
  verifiedBy: { name: string } | null;
  reviewedDocuments: string[];
  documentLegible: boolean;
  documentValid: boolean;
  identityMatches: boolean;
  photoMatches: boolean;
  duiLast4: string;
  imagesPurgeAfter: Date | null;
  imagesDeletedAt: Date | null;
}): IdentityVerificationDTO {
  return {
    id: row.id,
    verifiedAt: row.verifiedAt.toISOString(),
    verifiedByName: row.verifiedBy?.name ?? null,
    reviewedDocuments: row.reviewedDocuments as IdentityVerificationDTO["reviewedDocuments"],
    documentLegible: row.documentLegible,
    documentValid: row.documentValid,
    identityMatches: row.identityMatches,
    photoMatches: row.photoMatches,
    duiLast4: row.duiLast4,
    imagesPurgeAfter: row.imagesPurgeAfter?.toISOString() ?? null,
    imagesDeletedAt: row.imagesDeletedAt?.toISOString() ?? null,
  };
}

export async function listIdentityVerifications(businessId: string): Promise<IdentityVerificationDTO[]> {
  const rows = await prisma.identityVerification.findMany({
    where: { businessId },
    include: VERIFICATION_INCLUDE,
    orderBy: { verifiedAt: "desc" },
  });
  return rows.map(toDTO);
}

/**
 * Registra la verificación de identidad y, si el negocio todavía no estaba
 * aprobado (pendiente o rechazado), lo aprueba. El borrado de las imágenes
 * queda programado para `DOCUMENT_RETENTION_VERIFIED_DAYS` días después.
 *
 * Si el número ya aparece en OTRO negocio, no registra nada hasta que el admin
 * confirme que es el mismo titular (`confirmDuplicate`): es justamente lo que
 * la huella permite detectar (ej. alguien suspendido por fraude que vuelve a
 * registrarse). Es un aviso, no un bloqueo: una persona puede tener dos negocios.
 */
export async function verifyIdentity(
  businessId: string,
  input: VerifyIdentityInput,
  adminId: string,
): Promise<VerifyIdentityResult> {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: { id: true, name: true, status: true, isDemo: true },
  });
  if (!business) throw new AppError("NOT_FOUND", "No encontramos ese negocio.", 404);

  // Defensa en profundidad: el esquema ya lo validó, pero este es el único
  // punto donde el número completo se usa, así que no se confía en quien llama.
  if (!isValidDui(input.duiNumber)) {
    throw new AppError("INVALID_DUI", "El número de DUI no es válido.", 400);
  }

  // Tienen que estar subidas (y no rechazadas) las tres imágenes que se revisan.
  const present = await prisma.businessDocument.findMany({
    where: { businessId, rejectedAt: null, type: { in: [...IDENTITY_IMAGE_TYPES] } },
    select: { type: true },
  });
  const presentTypes = new Set(present.map((row) => row.type));
  const missing = IDENTITY_IMAGE_TYPES.filter((type) => !presentTypes.has(type));
  if (missing.length > 0) {
    throw new AppError(
      "DOCUMENTS_PENDING",
      "Para verificar la identidad tienen que estar subidos y vigentes el DUI (frente y reverso) y la foto del titular.",
      409,
    );
  }

  const needsApproval = business.status === "PENDING" || business.status === "REJECTED";
  // Mejor fallar ahora que dejar una verificación registrada de un negocio que no se pudo aprobar.
  if (needsApproval) await assertCanBeApproved(business);

  const fingerprint = computeDuiFingerprint(input.duiNumber);

  const matches = await prisma.identityVerification.findMany({
    where: { duiFingerprint: fingerprint, businessId: { not: businessId } },
    select: { business: { select: { id: true, name: true, status: true } } },
  });
  const duplicates = [...new Map(matches.map((match) => [match.business.id, match.business])).values()].map((other) => ({
    businessId: other.id,
    businessName: other.name,
    businessStatus: other.status,
  }));
  if (duplicates.length > 0 && !input.confirmDuplicate) {
    return { requiresConfirmation: true, duplicates };
  }

  const now = new Date();
  const purgeAfter = new Date(now.getTime() + DOCUMENT_RETENTION_VERIFIED_DAYS * 24 * 60 * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    // Una verificación nueva reemplaza el calendario de borrado de las anteriores.
    await tx.identityVerification.updateMany({
      where: { businessId, imagesDeletedAt: null },
      data: { imagesPurgeAfter: null },
    });
    return tx.identityVerification.create({
      data: {
        businessId,
        verifiedById: adminId,
        verifiedAt: now,
        reviewedDocuments: [...IDENTITY_IMAGE_TYPES],
        documentLegible: input.documentLegible,
        documentValid: input.documentValid,
        identityMatches: input.identityMatches,
        photoMatches: input.photoMatches,
        duiLast4: duiLast4(input.duiNumber),
        duiFingerprint: fingerprint,
        fingerprintVersion: DUI_FINGERPRINT_VERSION,
        imagesPurgeAfter: purgeAfter,
      },
      include: VERIFICATION_INCLUDE,
    });
  });

  let approved = false;
  if (needsApproval) {
    try {
      await updateAdminBusiness(businessId, { status: "APPROVED" }, adminId);
      approved = true;
    } catch (error) {
      // No dejar una verificación huérfana de un negocio que no se pudo aprobar.
      await prisma.identityVerification.delete({ where: { id: created.id } });
      throw error;
    }
  }

  // La auditoría nunca lleva el número: solo el id del registro y metadatos.
  await logAdminAction({
    adminId,
    action: "business.identity.verify",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: {
      verificationId: created.id,
      reviewedDocuments: [...IDENTITY_IMAGE_TYPES],
      approved,
      confirmedDuplicate: duplicates.length > 0,
    },
  });
  await logAdminAction({
    adminId,
    action: "business.identity.purge_scheduled",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: {
      verificationId: created.id,
      purgeAfter: purgeAfter.toISOString(),
      days: DOCUMENT_RETENTION_VERIFIED_DAYS,
    },
  });

  return { requiresConfirmation: false, verification: toDTO(created), approved };
}
