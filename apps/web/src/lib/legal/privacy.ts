/**
 * Política de privacidad: versión vigente y los plazos que la página
 * `/privacidad` promete sobre los documentos de identidad (DUI) de los
 * negocios. Viven acá, y no solo en el texto, para que la página y el código
 * que de verdad borra los datos nunca se contradigan.
 *
 * Cada vez que cambie el TEXTO de la política que afecte a los negocios hay
 * que subir `PRIVACY_POLICY_VERSION`: el titular tiene que volver a aceptarla
 * antes de subir un documento nuevo.
 */
export const PRIVACY_POLICY_VERSION = "2026-10-06.3";
export const PRIVACY_POLICY_UPDATED = "6 de octubre de 2026";

/**
 * La finalidad, con estas mismas palabras, en todos los lugares donde se pide
 * el DUI. A propósito NO dice "exclusivamente": MIMO puede necesitar el
 * documento para cumplir una obligación legal (un requerimiento de autoridad,
 * una auditoría, una disputa), y prometer un uso único lo dejaría atado de
 * manos. La redacción definitiva debe confirmarla un abogado.
 */
export const DOCUMENT_PURPOSE_STATEMENT =
  "Los documentos de identidad se utilizan para verificar la identidad y autenticidad de la cuenta del negocio y para cumplir las obligaciones legales aplicables.";

/** Días que se conservan los documentos de un negocio cuya solicitud fue rechazada. */
export const DOCUMENT_RETENTION_REJECTED_DAYS = 30;

/** Días que se conservan los documentos de un negocio dado de baja (tiempo para
 * resolver reclamos o disputas abiertas). */
export const DOCUMENT_RETENTION_CLOSED_DAYS = 90;

/**
 * ⚠️ DECISIÓN OPERATIVA PROVISIONAL — HAY QUE VALIDARLA CON UN ABOGADO ANTES
 * DEL LANZAMIENTO DEFINITIVO.
 *
 * Días que MIMO conserva las imágenes de identidad (DUI frente, DUI reverso y
 * foto del titular) DESPUÉS de aprobar a un negocio. Pasado ese plazo se
 * borran y solo queda el registro de que la identidad fue verificada (quién,
 * cuándo, qué se revisó, últimos 4 dígitos del DUI y una huella HMAC para
 * detectar duplicados) — ver `IdentityVerification` en el schema.
 *
 * El número 30 es un valor operativo razonable (margen para corregir un error
 * o atender una disputa sobre la decisión de aprobar), NO un requisito legal
 * confirmado. Si el abogado dice que hay que conservar las copias más tiempo
 * (obligación tributaria, de comercio electrónico, antilavado, etc.), o menos,
 * se cambia ESTA constante y nada más: la Política de privacidad y la
 * pantalla de verificación leen el valor desde acá. Los negocios ya
 * verificados conservan el plazo con el que fueron programados.
 */
export const DOCUMENT_RETENTION_VERIFIED_DAYS = 30;

/** Tipos de documento que cuentan como "imágenes de identidad" (los que se
 * borran tras la verificación). NIT y permisos son datos del negocio, no
 * personales: esos se conservan mientras el negocio esté activo. */
export const IDENTITY_IMAGE_TYPES = ["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"] as const;
