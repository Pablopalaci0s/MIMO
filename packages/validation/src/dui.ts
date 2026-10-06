import { z } from "zod";

/**
 * Utilidades para el DUI (Documento Único de Identidad, El Salvador).
 *
 * IMPORTANTE: el número completo del DUI NO se guarda en ninguna parte del
 * sistema. Estas funciones existen solo para que, en el instante en que un
 * administrador lo tipea para verificar a un negocio, se pueda (1) comprobar
 * que no tiene un error de tipeo, (2) quedarse con los últimos 4 dígitos y
 * (3) calcular una huella (HMAC) para detectar registros duplicados. Después
 * el número se descarta.
 */

/** Deja solo los dígitos: acepta "04295342-7", "04295342 7" o "042953427". */
export function normalizeDui(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Valida el formato (8 dígitos + 1 dígito verificador) y que el verificador
 * sea correcto: los primeros 8 dígitos se multiplican por 9, 8, 7, 6, 5, 4, 3
 * y 2, se suman, y el verificador es `10 - (suma % 10)` (0 si da 10).
 */
export function isValidDui(input: string): boolean {
  const digits = normalizeDui(input);
  if (!/^\d{9}$/.test(digits)) return false;
  const sum = digits
    .slice(0, 8)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (9 - index), 0);
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(digits[8]);
}

/** Los últimos 4 dígitos: lo único del número que se conserva. */
export function duiLast4(input: string): string {
  return normalizeDui(input).slice(-4);
}

export const duiNumberSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el número del DUI")
  .refine((value) => /^\d{9}$/.test(normalizeDui(value)), { message: "El DUI tiene 9 dígitos (8 + el verificador)" })
  .refine((value) => isValidDui(value), {
    message: "El dígito verificador no coincide: revisá que hayas copiado bien el número",
  });

/**
 * La verificación de identidad que registra un administrador. Los cuatro
 * criterios tienen que ser `true`: no existe un registro de "verificado" con
 * algo sin confirmar.
 */
export const verifyIdentitySchema = z.object({
  duiNumber: duiNumberSchema,
  documentLegible: z.literal(true, { errorMap: () => ({ message: "Confirmá que el documento es legible" }) }),
  documentValid: z.literal(true, { errorMap: () => ({ message: "Confirmá que el documento está vigente" }) }),
  identityMatches: z.literal(true, {
    errorMap: () => ({ message: "Confirmá que la identidad coincide con la del titular registrado" }),
  }),
  photoMatches: z.literal(true, {
    errorMap: () => ({ message: "Confirmá que la foto del titular coincide con la del DUI" }),
  }),
  /** El número ya está asociado a otro negocio: el admin confirma que es el mismo titular. */
  confirmDuplicate: z.boolean().optional(),
});
export type VerifyIdentityInput = z.infer<typeof verifyIdentitySchema>;
