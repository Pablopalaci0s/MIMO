import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, newId, type FakeDb } from "./support-test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

class ForbiddenError extends Error {}
class UnauthorizedError extends Error {}
const auth = vi.fn();

vi.mock("@mimo/auth", () => ({ auth, ForbiddenError, UnauthorizedError }));
vi.mock("@mimo/database", () => ({
  Prisma: {},
  prisma: new Proxy({}, { get: (_target, prop) => (holder.db.prisma as Record<string, unknown>)[prop as string] }),
}));

const { requireSupportStaff, resolveSupportStaff } = await import("./support-access-service");

function userWithRole(role: string, extra: Record<string, unknown> = {}) {
  return holder.db.users.rows[holder.db.users.rows.push({ id: newId(), name: role, email: `${role}@mimo.sv`, role, deletedAt: null, ...extra }) - 1]!;
}

beforeEach(() => {
  holder.db = createFakeDb();
  vi.clearAllMocks();
});

describe("quién entra al centro de soporte", () => {
  it.each(["SUPPORT_AGENT", "SUPPORT_MANAGER", "ADMIN"])("%s entra", async (role) => {
    const user = userWithRole(role);
    auth.mockResolvedValue({ user: { id: user.id, role } });
    await expect(requireSupportStaff()).resolves.toEqual({ id: user.id, role });
  });

  it.each(["USER", "BUSINESS"])("un %s NUNCA entra (clientes y negocios)", async (role) => {
    const user = userWithRole(role);
    auth.mockResolvedValue({ user: { id: user.id, role } });
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(resolveSupportStaff()).resolves.toBeNull();
  });

  it("sin sesión: no autenticado (401), no «prohibido»", async () => {
    auth.mockResolvedValue(null);
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(resolveSupportStaff()).resolves.toBeNull();
  });

  it("una cuenta de soporte SUSPENDIDA pierde el acceso al instante", async () => {
    const user = userWithRole("SUPPORT_AGENT", { deletedAt: new Date() });
    auth.mockResolvedValue({ user: { id: user.id, role: "SUPPORT_AGENT" } });
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("el rol sale de la BASE, no del JWT: un JWT viejo que dice ADMIN no sirve si hoy es un cliente", async () => {
    const user = userWithRole("USER");
    auth.mockResolvedValue({ user: { id: user.id, role: "ADMIN" } }); // JWT desactualizado o adulterado
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requireSupportStaff({ manager: true })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("y al revés: si hoy es agente en la base, entra aunque su JWT todavía diga USER (sin volver a iniciar sesión)", async () => {
    const user = userWithRole("SUPPORT_AGENT");
    auth.mockResolvedValue({ user: { id: user.id, role: "USER" } });
    await expect(requireSupportStaff()).resolves.toMatchObject({ role: "SUPPORT_AGENT" });
  });

  it("bajarle el rol a alguien corta su acceso en la siguiente llamada", async () => {
    const user = userWithRole("SUPPORT_MANAGER");
    auth.mockResolvedValue({ user: { id: user.id, role: "SUPPORT_MANAGER" } });
    await expect(requireSupportStaff({ manager: true })).resolves.toBeDefined();

    user.role = "SUPPORT_AGENT";
    await expect(requireSupportStaff({ manager: true })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requireSupportStaff()).resolves.toBeDefined(); // sigue siendo agente

    user.role = "USER";
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("las acciones de supervisión exigen SUPPORT_MANAGER o ADMIN; un agente no", async () => {
    const agent = userWithRole("SUPPORT_AGENT");
    auth.mockResolvedValue({ user: { id: agent.id, role: "SUPPORT_AGENT" } });
    await expect(requireSupportStaff({ manager: true })).rejects.toBeInstanceOf(ForbiddenError);

    for (const role of ["SUPPORT_MANAGER", "ADMIN"]) {
      const user = userWithRole(role);
      auth.mockResolvedValue({ user: { id: user.id, role } });
      await expect(requireSupportStaff({ manager: true })).resolves.toMatchObject({ role });
    }
  });

  it("una sesión de una cuenta que ya no existe no entra", async () => {
    auth.mockResolvedValue({ user: { id: newId(), role: "ADMIN" } });
    await expect(requireSupportStaff()).rejects.toBeInstanceOf(ForbiddenError);
  });
});
