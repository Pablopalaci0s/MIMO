/**
 * El backend siempre manda el detalle real del error de validación en
 * `fieldErrors` (ver `apiErrorFromException` en api-response.ts), pero la
 * mayoría de los formularios solo mostraban `error.message` — que para un
 * error de Zod es el genérico "Datos inválidos", sin decir CUÁL campo
 * falló ni por qué (ej. "Debe incluir al menos una mayúscula"). Un mismo
 * helper acá para que todos los formularios muestren el mensaje útil.
 */
export function apiErrorMessage(
  body: { error?: { message?: string; fieldErrors?: Record<string, string[]> } } | undefined | null,
  fallback: string,
): string {
  const fieldErrors = body?.error?.fieldErrors;
  const detail = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
  return detail ?? body?.error?.message ?? fallback;
}
