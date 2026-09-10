export function formatPreparationTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Teléfono salvadoreño de 8 dígitos (validado por `salvadoranPhone*` en
 * `@mimo/validation`) → "7899-1234" para mostrar. */
export function formatPhone(phone: string): string {
  return `${phone.slice(0, 4)}-${phone.slice(4)}`;
}

/** Acepta cualquier formato que el negocio haya guardado a mano
 * ("+503 7899-1234", "7899-1234", etc.) — se queda solo con los dígitos
 * para armar el link de wa.me, que no tolera separadores. */
export function whatsappHref(whatsapp: string): string {
  const digits = whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}
