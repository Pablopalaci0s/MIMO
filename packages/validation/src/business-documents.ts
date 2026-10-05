import { z } from "zod";

/**
 * Documentos de verificación del titular de un negocio. Definidos acá (y no
 * en la app) porque los comparten el servidor, el panel del negocio, el
 * panel de admin y los tests.
 */
export const BUSINESS_DOCUMENT_TYPES = ["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO", "TAX_ID", "PERMIT"] as const;
export type BusinessDocumentTypeValue = (typeof BUSINESS_DOCUMENT_TYPES)[number];

export const businessDocumentTypeSchema = z.enum(BUSINESS_DOCUMENT_TYPES, {
  errorMap: () => ({ message: "Tipo de documento inválido" }),
});

export type DetectedFileKind = "jpeg" | "png" | "webp" | "pdf";

export interface BusinessDocumentSpec {
  label: string;
  description: string;
  /** Sin estos documentos no se puede aprobar el negocio. */
  required: boolean;
  /** Formatos aceptados (el PDF solo donde tiene sentido: permisos y NIT). */
  accepts: readonly DetectedFileKind[];
}

const IMAGES: readonly DetectedFileKind[] = ["jpeg", "png", "webp"];
const IMAGES_OR_PDF: readonly DetectedFileKind[] = ["jpeg", "png", "webp", "pdf"];

export const BUSINESS_DOCUMENT_SPECS: Record<BusinessDocumentTypeValue, BusinessDocumentSpec> = {
  DUI_FRONT: {
    label: "DUI — frente",
    description: "Foto clara del frente del DUI del titular o representante legal.",
    required: true,
    accepts: IMAGES,
  },
  DUI_BACK: {
    label: "DUI — reverso",
    description: "Foto clara del reverso del mismo DUI.",
    required: true,
    accepts: IMAGES,
  },
  OWNER_PHOTO: {
    label: "Foto del titular con su DUI",
    description: "Una foto del titular sosteniendo su DUI, con la cara y el documento visibles.",
    required: true,
    accepts: IMAGES,
  },
  TAX_ID: {
    label: "NIT / NRC (opcional)",
    description: "Tarjeta o constancia de NIT y, si sos contribuyente de IVA, de NRC.",
    required: false,
    accepts: IMAGES_OR_PDF,
  },
  PERMIT: {
    label: "Permiso sanitario o municipal (opcional)",
    description: "Si vendés alimentos u otros productos regulados, el permiso que te corresponda.",
    required: false,
    accepts: IMAGES_OR_PDF,
  },
};

export const REQUIRED_BUSINESS_DOCUMENTS: readonly BusinessDocumentTypeValue[] = BUSINESS_DOCUMENT_TYPES.filter(
  (type) => BUSINESS_DOCUMENT_SPECS[type].required,
);

export const MAX_BUSINESS_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const FILE_KIND_MIME: Record<DetectedFileKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Qué tipo de archivo es REALMENTE, mirando sus primeros bytes ("números
 * mágicos"). El `Content-Type` y la extensión que manda el navegador los
 * controla quien sube el archivo — nunca se confía en ellos para decidir
 * qué se guarda ni con qué tipo se sirve después.
 */
export function detectFileKind(bytes: Uint8Array): DetectedFileKind | null {
  const at = (index: number) => bytes[index];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return "webp";
  }
  if (
    bytes.length >= 5 &&
    at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46 && at(4) === 0x2d
  ) {
    return "pdf";
  }
  return null;
}

/** Qué documentos obligatorios faltan, dado el conjunto de tipos ya subidos. */
export function missingRequiredDocuments(uploaded: Iterable<string>): BusinessDocumentTypeValue[] {
  const have = new Set(uploaded);
  return REQUIRED_BUSINESS_DOCUMENTS.filter((type) => !have.has(type));
}
