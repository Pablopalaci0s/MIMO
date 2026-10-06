import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, newId, type FakeDb } from "./support-test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

class KnownRequestError extends Error {
  code: string;
  constructor(code: string) {
    super("known");
    this.code = code;
  }
}

vi.mock("@mimo/database", () => ({
  Prisma: { PrismaClientKnownRequestError: KnownRequestError },
  prisma: new Proxy({}, { get: (_target, prop) => (holder.db.prisma as Record<string, unknown>)[prop as string] }),
}));
const logAdminAction = vi.fn<(input: Record<string, unknown>) => Promise<void>>(async () => {});
vi.mock("./admin-audit-service", () => ({ logAdminAction }));

const { getSupportProfile, setSupportUsername } = await import("./support-profile-service");

type Actor = { id: string; role: "SUPPORT_AGENT" | "SUPPORT_MANAGER" | "ADMIN" };

function staff(name: string, role: Actor["role"] = "SUPPORT_AGENT", extra: Record<string, unknown> = {}): Actor & { row: Record<string, unknown> } {
  const row = holder.db.users.rows[holder.db.users.rows.push({ id: newId(), name, email: `${name}@mimo.sv`, role, deletedAt: null, supportUsername: null, supportUsernameSetAt: null, ...extra }) - 1]!;
  return { id: row.id as string, role, row };
}

beforeEach(() => {
  holder.db = createFakeDb();
  vi.clearAllMocks();
});

describe("perfil de soporte: nombre de usuario", () => {
  it("antes de elegir: no está bloqueado y trae una sugerencia a partir del nombre", async () => {
    const ana = staff("Ana Martínez");
    expect(await getSupportProfile(ana)).toMatchObject({ username: null, locked: false, suggested: "ana.martinez", required: true });
  });

  it("al administrador no se le exige nombre de usuario", async () => {
    const admin = staff("Admin MIMO", "ADMIN");
    expect((await getSupportProfile(admin)).required).toBe(false);
  });

  it("elegirlo lo guarda en minúsculas, deja la fecha, lo bloquea y queda auditado", async () => {
    const ana = staff("Ana Martínez");
    const profile = await setSupportUsername(ana, "  Ana.M  ");
    expect(profile).toMatchObject({ username: "ana.m", locked: true });
    expect(ana.row.supportUsername).toBe("ana.m");
    expect(ana.row.supportUsernameSetAt).toBeInstanceOf(Date);
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ adminId: ana.id, action: "support.username_set", metadata: { username: "ana.m" } }));
  });

  it("solo se puede una vez: el segundo intento falla con 409 y no cambia nada", async () => {
    const ana = staff("Ana Martínez");
    await setSupportUsername(ana, "ana.m");
    const error = await setSupportUsername(ana, "otro.nombre").then(() => null, (e: { code?: string; status?: number }) => e);
    expect(error).toMatchObject({ code: "USERNAME_ALREADY_SET", status: 409 });
    expect(ana.row.supportUsername).toBe("ana.m");
    expect(logAdminAction).toHaveBeenCalledTimes(1);
  });

  it("dos pestañas a la vez: una gana y la otra recibe 409 (la regla vive en la base, no en la pantalla)", async () => {
    const ana = staff("Ana Martínez");
    const results = await Promise.allSettled([setSupportUsername(ana, "ana.uno"), setSupportUsername(ana, "ana.dos")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(["ana.uno", "ana.dos"]).toContain(ana.row.supportUsername);
  });

  it("no se puede usar el nombre de otra persona (ni con otras mayúsculas)", async () => {
    staff("Beto Rivas", "SUPPORT_AGENT", { supportUsername: "beto" });
    const ana = staff("Ana Martínez");
    const error = await setSupportUsername(ana, "BETO").then(() => null, (e: { code?: string }) => e);
    expect(error).toMatchObject({ code: "USERNAME_TAKEN" });
    expect(ana.row.supportUsername).toBeNull();
  });

  it("si la base rechaza por índice único (carrera entre dos personas), también es USERNAME_TAKEN", async () => {
    const ana = staff("Ana Martínez");
    vi.spyOn(holder.db.users, "updateMany").mockRejectedValueOnce(new KnownRequestError("P2002"));
    const error = await setSupportUsername(ana, "ana.m").then(() => null, (e: { code?: string; status?: number }) => e);
    expect(error).toMatchObject({ code: "USERNAME_TAKEN", status: 409 });
  });

  it("rechaza nombres inválidos o reservados sin tocar la base", async () => {
    const ana = staff("Ana Martínez");
    for (const bad of ["ab", "con espacios", "ñandú", "admin", "soporte", "a".repeat(30)]) {
      const error = await setSupportUsername(ana, bad).then(() => null, (e: { code?: string; status?: number }) => e);
      expect(error, bad).toMatchObject({ code: "INVALID_USERNAME", status: 400 });
    }
    expect(ana.row.supportUsername).toBeNull();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it("el perfil siempre es el de quien pregunta: pedir el de otra persona no existe en el servicio", async () => {
    const ana = staff("Ana Martínez");
    const beto = staff("Beto Rivas", "SUPPORT_AGENT", { supportUsername: "beto" });
    expect((await getSupportProfile(ana)).username).toBeNull();
    expect((await getSupportProfile(beto)).username).toBe("beto");
  });
});
