/**
 * Utilidades de fecha en UTC — el server corre en America/El_Salvador
 * (UTC-6), así que cualquier comparación de fechas tipo "YYYY-MM-DD" debe
 * hacerse en UTC consistente en ambos lados o "hoy" se marca como pasado
 * (gotcha real documentado en CLAUDE.md). Antes esta lógica estaba
 * duplicada a mano en order-service.ts e important-date-service.ts —
 * unificada acá para que solo haya un lugar donde se pueda romper.
 */

/** Medianoche UTC del día calendario de `date` (descarta la hora). */
export function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Parsea una fecha "YYYY-MM-DD" como medianoche UTC de ESE día — nunca la
 * hora local del server. */
export function parseUtcDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** Días de calendario entre dos fechas en UTC (ignora la hora del día).
 * Positivo si `to` es posterior a `from`. */
export function daysBetweenUtc(from: Date, to: Date): number {
  const fromUtc = utcDateOnly(from);
  const toUtc = utcDateOnly(to);
  return Math.round((toUtc.getTime() - fromUtc.getTime()) / (1000 * 60 * 60 * 24));
}
