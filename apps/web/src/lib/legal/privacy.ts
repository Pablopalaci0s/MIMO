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
export const PRIVACY_POLICY_VERSION = "2026-10-06";
export const PRIVACY_POLICY_UPDATED = "6 de octubre de 2026";

/** La finalidad, con estas mismas palabras, en todos los lugares donde se pide el DUI. */
export const DOCUMENT_PURPOSE_STATEMENT =
  "Se utilizará exclusivamente para verificar la identidad y autenticidad de la cuenta del negocio.";

/** Días que se conservan los documentos de un negocio cuya solicitud fue rechazada. */
export const DOCUMENT_RETENTION_REJECTED_DAYS = 30;

/** Días que se conservan los documentos de un negocio dado de baja (tiempo para
 * resolver reclamos o disputas abiertas). */
export const DOCUMENT_RETENTION_CLOSED_DAYS = 90;
