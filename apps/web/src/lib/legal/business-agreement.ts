/**
 * Versión vigente del Acuerdo MIMO ↔ negocio (página `/terminos-negocios`).
 *
 * Cada vez que cambie el TEXTO del acuerdo hay que subir esta versión: los
 * negocios que aceptaron una versión anterior ven un aviso en su panel para
 * aceptar la nueva, y el admin no puede aprobar un negocio que no aceptó la
 * versión vigente (ver `business-agreement-service.ts`).
 *
 * Valores de negocio que el texto del acuerdo menciona y que viven acá para
 * que la página y el código no se contradigan.
 */
export const BUSINESS_AGREEMENT_VERSION = "2026-10-05.2";
export const BUSINESS_AGREEMENT_UPDATED = "5 de octubre de 2026";

/** Ventana (minutos) que tiene un negocio para confirmar su parte de un
 * pedido antes de que se cancele sola — la aplica `/api/cron/expirar-pedidos`. */
export const ORDER_CONFIRMATION_WINDOW_MINUTES = 45;

/** Días de aviso previo ante un cambio de comisión o del acuerdo. */
export const AGREEMENT_CHANGE_NOTICE_DAYS = 15;
