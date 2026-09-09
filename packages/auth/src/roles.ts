export type MimoRole = "USER" | "BUSINESS" | "ADMIN";

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No tenés permisos para esta acción") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Throws ForbiddenError unless the session role is one of `allowed`.
 * ADMIN always passes — it's the superset role in every check.
 */
export function assertRole(role: MimoRole | undefined, allowed: MimoRole[]): void {
  if (!role) throw new UnauthorizedError();
  if (role === "ADMIN") return;
  if (!allowed.includes(role)) throw new ForbiddenError();
}
