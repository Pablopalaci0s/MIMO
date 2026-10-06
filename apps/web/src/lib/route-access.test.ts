import { describe, expect, it } from "vitest";
import { canAccessRoute, type RouteRole } from "./route-access";

const ALL: (RouteRole | undefined)[] = [undefined, "USER", "BUSINESS", "ADMIN", "SUPPORT_AGENT", "SUPPORT_MANAGER"];

describe("acceso por ruta (proxy)", () => {
  it("/admin es SOLO de administradores: un agente o un supervisor de soporte NO entra", () => {
    for (const path of ["/admin", "/admin/usuarios", "/admin/negocios/abc/documentos", "/admin/auditoria"]) {
      for (const role of ALL) expect(canAccessRoute(path, role), `${role} → ${path}`).toBe(role === "ADMIN");
    }
    expect(canAccessRoute("/admin/negocios", "SUPPORT_AGENT")).toBe(false);
    expect(canAccessRoute("/admin/negocios", "SUPPORT_MANAGER")).toBe(false);
  });

  it("/centro-soporte es de administradores y personal de soporte; nunca de clientes, negocios o visitantes", () => {
    for (const path of ["/centro-soporte", "/centro-soporte/metricas", "/centro-soporte/configuracion"]) {
      for (const role of ALL) {
        expect(canAccessRoute(path, role), `${role} → ${path}`).toBe(role === "ADMIN" || role === "SUPPORT_AGENT" || role === "SUPPORT_MANAGER");
      }
    }
  });

  it("/negocio sigue siendo de negocios y administradores (el personal de soporte no entra)", () => {
    for (const role of ALL) expect(canAccessRoute("/negocio/pedidos", role)).toBe(role === "BUSINESS" || role === "ADMIN");
    expect(canAccessRoute("/negocio", "SUPPORT_AGENT")).toBe(false);
  });

  it("un prefijo parecido NO cuenta como la ruta protegida (y tampoco la deja sin proteger)", () => {
    // "/administrador" no es "/admin": no se protege ni se confunde.
    expect(canAccessRoute("/administrador", "USER")).toBe(true);
    expect(canAccessRoute("/centro-soporte-falso", "USER")).toBe(true);
    // pero cualquier subruta real de /admin sí
    expect(canAccessRoute("/admin/", "USER")).toBe(false);
  });

  it("el resto del sitio es público", () => {
    for (const role of ALL) {
      expect(canAccessRoute("/", role)).toBe(true);
      expect(canAccessRoute("/soporte", role)).toBe(true);
    }
  });
});
