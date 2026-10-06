import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const count = vi.fn();

vi.mock("@mimo/database", () => ({ Prisma: {}, prisma: { user: { findUnique, update, count } } }));
vi.mock("./admin-audit-service", () => ({ logAdminAction: vi.fn() }));

const { updateAdminUser } = await import("./admin-user-service");

const userRow = (overrides = {}) => ({
  id: "target",
  name: "Otro admin",
  email: "otro@mimo.sv",
  phone: null,
  role: "ADMIN",
  deletedAt: null,
  canReviewDocuments: false,
  _count: { businessMemberships: 0, orders: 0 },
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  update.mockImplementation(async ({ data }) => userRow(data));
});

/** findUnique se llama por el usuario objetivo y por el actor (según el id). */
function mockUsers(target: object, actor: object) {
  findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => (where.id === "target" ? target : actor));
}

describe("permiso de ver documentos de identidad", () => {
  it("un admin SIN el permiso no puede otorgarlo a nadie", async () => {
    mockUsers({ id: "target", role: "ADMIN" }, { canReviewDocuments: false });
    await expect(updateAdminUser("target", "actor", { canReviewDocuments: true })).rejects.toMatchObject({
      code: "DOCUMENT_REVIEW_FORBIDDEN",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("un admin autorizado puede otorgarlo a otro admin", async () => {
    mockUsers({ id: "target", role: "ADMIN" }, { canReviewDocuments: true });
    const dto = await updateAdminUser("target", "actor", { canReviewDocuments: true });
    expect(dto.canReviewDocuments).toBe(true);
  });

  it("solo se otorga a administradores (no a clientes ni dueños de negocio)", async () => {
    mockUsers({ id: "target", role: "BUSINESS" }, { canReviewDocuments: true });
    await expect(updateAdminUser("target", "actor", { canReviewDocuments: true })).rejects.toMatchObject({
      code: "INVALID_TARGET",
    });
  });

  it("no se puede quitar al último administrador autorizado", async () => {
    mockUsers({ id: "target", role: "ADMIN" }, { canReviewDocuments: true });
    count.mockResolvedValue(0);
    await expect(updateAdminUser("target", "actor", { canReviewDocuments: false })).rejects.toMatchObject({
      code: "LAST_REVIEWER",
    });

    count.mockResolvedValue(1);
    await expect(updateAdminUser("target", "actor", { canReviewDocuments: false })).resolves.toBeDefined();
  });

  it("dejar de ser admin también quita el permiso", async () => {
    mockUsers({ id: "target", role: "ADMIN" }, {});
    await updateAdminUser("target", "actor", { role: "USER" });
    expect(update.mock.calls[0]![0].data).toMatchObject({ role: "USER", canReviewDocuments: false });
  });
});
