/**
 * Error de dominio genérico para servicios (no HTTP, no Prisma) — permite a
 * cualquier service lanzar un error con código/mensaje claro para el
 * usuario, sin acoplarse a Next.js. `apiErrorFromException` lo traduce a
 * una respuesta HTTP consistente.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
