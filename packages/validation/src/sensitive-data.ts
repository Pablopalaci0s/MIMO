import { isValidDui } from "./dui";

/**
 * Enmascara datos sensibles que alguien escribe voluntariamente en un chat o
 * formulario de soporte (un DUI, el número de una tarjeta) ANTES de guardarlos
 * y antes de mandárselos a la IA.
 *
 * Principios:
 *  - Solo se enmascara lo que REALMENTE es lo que parece: un DUI con formato y
 *    dígito verificador válidos; una tarjeta de 13–19 dígitos con un agrupado
 *    razonable, un prefijo (IIN) de una marca conocida y que pase Luhn. Es
 *    preferible dejar pasar un dato dudoso que romper un mensaje legítimo
 *    (números de pedido, teléfonos, montos, fechas, códigos).
 *  - Se conserva el resto del mensaje tal cual.
 *  - El valor original NO se devuelve ni se registra: el resultado solo dice
 *    QUÉ tipos se ocultaron, nunca cuáles eran los números.
 */

export type SensitiveKind = "DUI" | "CARD";

export interface RedactionResult {
  text: string;
  redacted: boolean;
  kinds: SensitiveKind[];
}

export const DUI_MASK = "[DUI oculto]";
export const CARD_MASK = "[tarjeta oculta]";

/** Lo que NO puede estar pegado antes de un número para que cuente como uno
 * "suelto": letras/dígitos/guion bajo (parte de un código), `+` (teléfono con
 * prefijo), `-` (ej. "MIMO-20260912-7AB12"), `.`/`,` (decimales y miles) y `/`
 * (URLs). */
const BEFORE = String.raw`(?<![\p{L}\p{N}_+\-.,/])`;
/** Y lo que no puede venir inmediatamente después. */
const AFTER = String.raw`(?![\p{L}\p{N}])`;

// ───────────────────────────── tarjetas ─────────────────────────────

function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Marca por prefijo (IIN) y largo permitido. */
function matchesKnownBrand(d: string): boolean {
  const len = d.length;
  const p2 = Number(d.slice(0, 2));
  const p3 = Number(d.slice(0, 3));
  const p4 = Number(d.slice(0, 4));
  if (d[0] === "4") return len === 13 || len === 16 || len === 19; // Visa
  if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) return len === 16; // Mastercard
  if (p2 === 34 || p2 === 37) return len === 15; // American Express
  if (p4 === 6011 || p2 === 65 || (p3 >= 644 && p3 <= 649)) return len >= 16 && len <= 19; // Discover
  if (p4 >= 3528 && p4 <= 3589) return len >= 16 && len <= 19; // JCB
  if ((p3 >= 300 && p3 <= 305) || p2 === 36 || p2 === 38 || p2 === 39) return len >= 14 && len <= 19; // Diners
  return false;
}

/** Contiguo, o en grupos con UN solo tipo de separador y un agrupado típico de tarjeta. */
function hasReasonableGrouping(raw: string): boolean {
  if (/^\d+$/.test(raw)) return true;
  const separators = new Set(raw.replace(/\d/g, "").split(""));
  if (separators.size !== 1) return false;
  const groups = raw.split(/[ -]/);
  if (groups.length < 3 || groups.length > 5) return false;
  const lengths = groups.map((group) => group.length);
  const standard = lengths.slice(0, -1).every((length) => length === 4) && lengths[lengths.length - 1]! >= 1 && lengths[lengths.length - 1]! <= 4;
  const amex = lengths.length === 3 && lengths[0] === 4 && lengths[1] === 6 && lengths[2] === 5;
  return standard || amex;
}

// Dígitos con un separador opcional (espacio o guion) entre cada uno; el largo exacto se valida después.
const CARD_CANDIDATE = new RegExp(`${BEFORE}(\\d(?:[ -]?\\d){12,22})${AFTER}`, "gu");

function isCardNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  return hasReasonableGrouping(raw) && matchesKnownBrand(digits) && luhn(digits);
}

// ─────────────────────────────── DUI ───────────────────────────────

const DUI_HYPHENATED = new RegExp(`${BEFORE}(\\d{8}-\\d)${AFTER}`, "gu");
const DUI_CONTIGUOUS = new RegExp(`${BEFORE}(\\d{9})${AFTER}`, "gu");

// ───────────────────────────── público ─────────────────────────────

export function redactSensitive(input: string): RedactionResult {
  const kinds = new Set<SensitiveKind>();
  let text = input;

  // Primero tarjetas (son más largas y pueden contener 9 dígitos que parezcan un DUI).
  text = text.replace(CARD_CANDIDATE, (match) => {
    if (!isCardNumber(match)) return match;
    kinds.add("CARD");
    return CARD_MASK;
  });

  for (const pattern of [DUI_HYPHENATED, DUI_CONTIGUOUS]) {
    text = text.replace(pattern, (match) => {
      if (!isValidDui(match)) return match;
      kinds.add("DUI");
      return DUI_MASK;
    });
  }

  return { text, redacted: kinds.size > 0, kinds: [...kinds] };
}
