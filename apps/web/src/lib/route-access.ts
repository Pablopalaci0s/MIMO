/**
 * Regla de acceso por ruta del `proxy.ts` (la primera barrera, con el rol que
 * trae el JWT). Es una función pura y sin dependencias a propósito, para poder
 * probar sin NextAuth que cada rol entra solo a lo suyo.
 *
 * Importante: las páginas de `/admin` NO se protegen a sí mismas: dependen de
 * esta regla. Por eso el personal de soporte (SUPPORT_AGENT / SUPPORT_MANAGER)
 * NO entra a `/admin` y tiene su propia área, `/centro-soporte`. La
 * autorización de esa área se vuelve a verificar contra la base en cada página
 * y cada ruta de API (ver `support-access-service.ts`).
 */

export type RouteRole = "USER" | "BUSINESS" | "ADMIN" | "SUPPORT_AGENT" | "SUPPORT_MANAGER";

const ADMIN_PREFIX = "/admin";
const BUSINESS_PREFIX = "/negocio";
const SUPPORT_PREFIX = "/centro-soporte";

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** `true` si ese rol (o ausencia de sesión) puede entrar a esa ruta. */
export function canAccessRoute(pathname: string, role: RouteRole | undefined): boolean {
  if (underPrefix(pathname, ADMIN_PREFIX)) return role === "ADMIN";
  if (underPrefix(pathname, BUSINESS_PREFIX)) return role === "BUSINESS" || role === "ADMIN";
  if (underPrefix(pathname, SUPPORT_PREFIX)) return role === "ADMIN" || role === "SUPPORT_AGENT" || role === "SUPPORT_MANAGER";
  return true;
}
