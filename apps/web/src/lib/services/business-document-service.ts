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
import { logAdminAction } from "./admin-audit-service";
import { createNotification } from "./notification-service";

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

/** Faltan los obligatorios que no se subieron O que un admin rechazó (un
 * documento rechazado cuenta como no subido hasta que se reemplace). */
export async function getMissingDocuments(businessId: string): Promise<BusinessDocumentTypeValue[]> {
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
