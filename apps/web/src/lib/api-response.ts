import { NextResponse } from "next/server";
import type { ApiResponse } from "@mimo/types";
import { ForbiddenError, UnauthorizedError } from "@mimo/auth";
import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function apiSuccess<T>(data: T, init?: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: init ?? 200 });
}

export function apiError(code: string, message: string, status: number, fieldErrors?: Record<string, string[]>): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: { code, message, fieldErrors } }, { status });
}

/**
 * Traduce errores conocidos (Zod, auth) a respuestas HTTP consistentes para
 * que cada route handler de /api/* no repita el mismo switch — ver la
 * sección 3 del spec sobre una capa de servicios/API bien definida.
 */
export function apiErrorFromException(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", "Datos inválidos", 400, error.flatten().fieldErrors as Record<string, string[]>);
  }
  if (error instanceof UnauthorizedError) {
    return apiError("UNAUTHORIZED", error.message, 401);
  }
  if (error instanceof ForbiddenError) {
    return apiError("FORBIDDEN", error.message, 403);
  }
  if (error instanceof AppError) {
    return apiError(error.code, error.message, error.status);
  }
  // Este es el único caso que representa un bug real (los de arriba son
  // errores de dominio esperables) — se manda a Sentry además de loguearse,
  // no fingir que "no pasó nada" solo porque ya devolvimos un 500 al cliente.
  Sentry.captureException(error);
  logger.error("Error inesperado en una ruta de /api", {
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  });
  return apiError("INTERNAL_ERROR", "Ocurrió un error inesperado", 500);
}
