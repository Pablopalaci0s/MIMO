/**
 * Logging estructurado (JSON, una línea por evento) en vez de `console.log`
 * suelto — así un servicio de logs real (Vercel, Datadog, lo que sea) puede
 * parsear/filtrar por `level` o por los campos de `context` en vez de tener
 * que grepear texto libre.
 */
type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
