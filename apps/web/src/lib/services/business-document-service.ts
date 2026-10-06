import { prisma } from "@mimo/database";
import type { BusinessDocumentDTO, BusinessDocumentType } from "@mimo/types";
import {
  BUSINESS_DOCUMENT_SPECS,
  FILE_KIND_MIME,
  MAX_BUSINESS_DOCUMENT_BYTES,
  detectFileKind,
  formatRejectionReason,
  missingRequiredDocuments,
  type BusinessDocumentTypeValue,
  type RejectBusinessDocumentInput,
} from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { DOCUMENT_RETENTION_CLOSED_DAYS, IDENTITY_IMAGE_TYPES } from "@/lib/legal/privacy";
import { logger } from "@/lib/logger";
import { logAdminAction } from "./admin-audit-service";
import { createNotification } from "./notification-service";
import { assertPrivacyAccepted } from "./business-privacy-service";

/**
 * Documentos de verificación del titular (DUI, foto, NIT, permisos) — datos
 * personales sensibles. Única fuente de lectura/escritura: se guardan en la
 * base (no en `public/`, que es público), nunca se incluyen en un DTO ni en
 * un listado (solo metadatos) y el archivo solo se entrega por las rutas
 * autenticadas que llaman a `getBusinessDocumentFile`.
 */

const META_SELECT = {
  type: true,
  mimeType: true,
  sizeBytes: true,
  updatedAt: true,
  rejectionReason: true,
} as const;

function toDTO(row: {
  type: BusinessDocumentTypeValue;
  mimeType: string;
  sizeBytes: number;
  updatedAt: Date;
  rejectionReason: string | null;
}): BusinessDocumentDTO {
  return {
    type: row.type,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.updatedAt.toISOString(),
    rejectionReason: row.rejectionReason,
  };
}

export async function listBusinessDocuments(businessId: string): Promise<BusinessDocumentDTO[]> {
  const rows = await prisma.businessDocument.findMany({ where: { businessId }, select: META_SELECT });
  return rows.map(toDTO);
}

/** ¿Un administrador ya registró la verificación de identidad de este negocio? */
export async function hasIdentityVerification(businessId: string): Promise<boolean> {
  const found = await prisma.identityVerification.findFirst({ where: { businessId }, select: { id: true } });
  return found !== null;
}

/** La primera aprobación de un negocio real exige que su identidad esté verificada
 * (la verificación se registra desde `identity-verification-service.ts`). */
export async function assertIdentityVerified(business: { id: string; isDemo: boolean }): Promise<void> {
  if (business.isDemo) return;
  if (await hasIdentityVerification(business.id)) return;
  throw new AppError(
    "IDENTITY_NOT_VERIFIED",
    "Antes de aprobar este negocio hay que verificar la identidad del titular: abrí sus documentos (botón Revisar y aprobar) y completá la verificación.",
    409,
  );
}

/** Faltan los obligatorios que no se subieron O que un admin rechazó (un
 * documento rechazado cuenta como no subido hasta que se reemplace). */
export async function getMissingDocuments(businessId: string): Promise<BusinessDocumentTypeValue[]> {
  // Un negocio cuya identidad ya fue verificada no debe volver a "faltar" el
  // DUI cuando sus imágenes se borran por política de conservación.
  if (await hasIdentityVerification(businessId)) return [];
  const rows = await prisma.businessDocument.findMany({
    where: { businessId, rejectedAt: null },
    select: { type: true },
  });
  return missingRequiredDocuments(rows.map((row) => row.type));
}

/**
 * Valida y guarda (o reemplaza) un documento. El tipo de archivo se decide
 * por su contenido real, no por el `Content-Type` ni la extensión que mande
 * el navegador, y el mime que se guarda (y con el que se sirve después) sale
 * de esa detección.
 */
export async function saveBusinessDocument(
  businessId: string,
  userId: string,
  type: BusinessDocumentType,
  file: File,
): Promise<BusinessDocumentDTO> {
  // Sin consentimiento vigente a la Política de privacidad no se guarda ningún
  // documento de identidad.
  await assertPrivacyAccepted(businessId);

  if (file.size === 0) throw new AppError("INVALID_FILE", "El archivo está vacío.", 400);
  if (file.size > MAX_BUSINESS_DOCUMENT_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "El archivo no puede pesar más de 5MB.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectFileKind(buffer);
  const spec = BUSINESS_DOCUMENT_SPECS[type];
  if (!kind || !spec.accepts.includes(kind)) {
    const accepted = spec.accepts.includes("pdf") ? "una imagen (JPG, PNG o WEBP) o un PDF" : "una imagen JPG, PNG o WEBP";
    throw new AppError("INVALID_TYPE", `Ese archivo no es válido: subí ${accepted}.`, 400);
  }

  const row = await prisma.businessDocument.upsert({
    where: { businessId_type: { businessId, type } },
    create: { businessId, type, mimeType: FILE_KIND_MIME[kind], sizeBytes: buffer.length, data: buffer, uploadedById: userId },
    // Subir uno nuevo limpia el rechazo: vuelve a quedar pendiente de revisión.
    update: {
      mimeType: FILE_KIND_MIME[kind],
      sizeBytes: buffer.length,
      data: buffer,
      uploadedById: userId,
      rejectedAt: null,
      rejectionReason: null,
      rejectedById: null,
    },
    select: META_SELECT,
  });
  return toDTO(row);
}

/** El archivo en sí. Quien llama es responsable de haber autorizado el acceso. */
export async function getBusinessDocumentFile(
  businessId: string,
  type: BusinessDocumentType,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const row = await prisma.businessDocument.findUnique({
    where: { businessId_type: { businessId, type } },
    select: { data: true, mimeType: true },
  });
  return row ? { data: Buffer.from(row.data), mimeType: row.mimeType } : null;
}

/** Vista de un admin: igual que la del titular, pero queda en la auditoría
 * (quién abrió el DUI de quién y cuándo). */
export async function getBusinessDocumentFileForAdmin(
  businessId: string,
  type: BusinessDocumentType,
  adminId: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const file = await getBusinessDocumentFile(businessId, type);
  if (file) {
    await logAdminAction({
      adminId,
      action: "business.document.view",
      targetType: "BUSINESS",
      targetId: businessId,
      metadata: { type },
    });
  }
  return file;
}

/**
 * Un admin rechaza un documento puntual (ej. DUI borroso): queda como "no
 * subido", el titular recibe una notificación con el motivo y el enlace para
 * subir uno nuevo, y la acción queda en la auditoría. No cambia el estado del
 * negocio — si ya estaba aprobado sigue publicado hasta que el admin decida
 * otra cosa.
 */
export async function rejectBusinessDocument(
  businessId: string,
  type: BusinessDocumentTypeValue,
  input: RejectBusinessDocumentInput,
  adminId: string,
): Promise<BusinessDocumentDTO> {
  const existing = await prisma.businessDocument.findUnique({
    where: { businessId_type: { businessId, type } },
    select: { id: true },
  });
  if (!existing) throw new AppError("NOT_FOUND", "El negocio no subió ese documento.", 404);

  const reason = formatRejectionReason(input);
  const row = await prisma.businessDocument.update({
    where: { id: existing.id },
    data: { rejectedAt: new Date(), rejectionReason: reason, rejectedById: adminId },
    select: META_SELECT,
  });

  const owner = await prisma.businessUser.findFirst({ where: { businessId, role: "OWNER" }, select: { userId: true } });
  if (owner) {
    await createNotification({
      userId: owner.userId,
      type: "SYSTEM",
      title: "Tenés que volver a subir un documento",
      body: `${BUSINESS_DOCUMENT_SPECS[type].label}: ${reason}.`,
      linkHref: "/negocio/verificacion",
    });
  }

  await logAdminAction({
    adminId,
    action: "business.document.reject",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: { type, reason: input.reason },
  });

  return toDTO(row);
}

/** El admin no puede aprobar un negocio real sin los documentos obligatorios.
 * Los negocios demo quedan afuera. */
export async function assertDocumentsComplete(business: { id: string; isDemo: boolean }): Promise<void> {
  if (business.isDemo) return;
  const missing = await getMissingDocuments(business.id);
  if (missing.length === 0) return;
  const labels = missing.map((type) => BUSINESS_DOCUMENT_SPECS[type].label).join(", ");
  throw new AppError(
    "DOCUMENTS_PENDING",
    `Este negocio todavía no subió sus documentos de verificación (faltan: ${labels}).`,
    409,
  );
}

/**
 * Borra TODOS los documentos de identidad de un negocio (a pedido del titular,
 * o porque ya no hay motivo para conservarlos). Irreversible, y queda en la
 * auditoría con cuántos se borraron.
 */
export async function deleteAllBusinessDocuments(businessId: string, adminId: string): Promise<{ deleted: number }> {
  const result = await prisma.businessDocument.deleteMany({ where: { businessId } });
  await logAdminAction({
    adminId,
    action: "business.document.delete",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: { deleted: result.count },
  });
  return { deleted: result.count };
}

/**
 * Cumple los plazos de conservación de la Política de privacidad (ver
 * `lib/legal/privacy.ts`): borra los documentos de identidad de
 *  - negocios RECHAZADOS cuyo `documentsPurgeAfter` ya venció, y
 *  - negocios dados de baja (`deletedAt`) hace más de
 *    `DOCUMENT_RETENTION_CLOSED_DAYS` días.
 * Los negocios activos o suspendidos conservan sus documentos. Lo corre
 * `/api/cron/purgar-documentos`.
 */
export async function purgeExpiredBusinessDocuments(now: Date = new Date()): Promise<{ businesses: number; documents: number }> {
  const closedBefore = new Date(now.getTime() - DOCUMENT_RETENTION_CLOSED_DAYS * 24 * 60 * 60 * 1000);
  const businesses = await prisma.business.findMany({
    where: {
      documents: { some: {} },
      OR: [
        { status: "REJECTED", documentsPurgeAfter: { lte: now } },
        { deletedAt: { lte: closedBefore } },
      ],
    },
    select: { id: true },
  });
  if (businesses.length === 0) return { businesses: 0, documents: 0 };

  let documents = 0;
  for (const business of businesses) {
    const result = await prisma.businessDocument.deleteMany({ where: { businessId: business.id } });
    documents += result.count;
    await logAdminAction({
      adminId: null,
      action: "business.documents.purged",
      targetType: "BUSINESS",
      targetId: business.id,
      metadata: { deleted: result.count, reason: "retention_expired" },
    });
  }
  logger.info("documentos de identidad purgados por vencimiento del plazo de conservación", {
    businesses: businesses.length,
    documents,
  });
  return { businesses: businesses.length, documents };
}

/**
 * Borra las imágenes de identidad (DUI frente, reverso y foto del titular) de
 * los negocios cuya verificación ya cumplió `DOCUMENT_RETENTION_VERIFIED_DAYS`
 * (el plazo vive en `lib/legal/privacy.ts` y es PROVISIONAL, a validar con un
 * abogado). Es un borrado real de las filas — los bytes están en
 * `BusinessDocument.data`, no hay un "marcado como borrado" — y no toca el
 * registro de verificación, NIT ni permisos. Cada ejecución queda en la
 * auditoría como acción del sistema.
 */
export async function purgeVerifiedIdentityImages(
  now: Date = new Date(),
): Promise<{ verifications: number; documents: number }> {
  const due = await prisma.identityVerification.findMany({
    where: { imagesDeletedAt: null, imagesPurgeAfter: { lte: now } },
    select: { id: true, businessId: true },
  });

  let documents = 0;
  for (const verification of due) {
    const result = await prisma.businessDocument.deleteMany({
      where: { businessId: verification.businessId, type: { in: [...IDENTITY_IMAGE_TYPES] } },
    });
    documents += result.count;
    await prisma.identityVerification.update({
      where: { id: verification.id },
      data: { imagesDeletedAt: now },
    });
    await logAdminAction({
      adminId: null,
      action: "business.identity.images_deleted",
      targetType: "BUSINESS",
      targetId: verification.businessId,
      metadata: { verificationId: verification.id, deleted: result.count },
    });
  }
  if (due.length > 0) {
    logger.info("imágenes de identidad borradas tras el plazo posterior a la verificación", {
      verifications: due.length,
      documents,
    });
  }
  return { verifications: due.length, documents };
}
