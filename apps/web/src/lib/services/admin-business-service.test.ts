import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const count = vi.fn();
const assertCanBeApproved = vi.fn();
const assertDocumentsComplete = vi.fn();

vi.mock("@mimo/database", () => ({ Prisma: {}, prisma: { business: { findFirst, update, count } } }));
vi.mock("./admin-audit-service", () => ({ logAdminAction: vi.fn() }));
vi.mock("./notification-service", () => ({ createNotification: vi.fn() }));
vi.mock("./business-agreement-service", () => ({ assertCanBeApproved }));
vi.mock("./business-document-service", () => ({ assertDocumentsComplete }));

const { updateAdminBusiness } = await import("./admin-business-service");

function businessRow(status: string) {
  return {
    id: "b1",
    name: "Negocio",
    slug: "negocio",
    status,
    verified: false,
    isDemo: false,
    municipality: null,
    members: [],
    _count: { products: 0 },
    agreements: [],
    documents: [],
    ratingAvg: 0,
    ratingCount: 0,
    commissionRate: 10,
    createdAt: new Date(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(0);
  update.mockImplementation(async ({ data }) => ({ ...businessRow(data.status ?? "APPROVED") }));
});

describe("updateAdminBusiness — requisitos de aprobación", () => {
  it.each(["PENDING", "REJECTED"])("la primera aprobación (%s → APPROVED) exige acuerdo y documentos", async (from) => {
    findFirst.mockResolvedValue({ id: "b1", isDemo: false, status: from });
    await updateAdminBusiness("b1", { status: "APPROVED" }, "admin1");

    expect(assertCanBeApproved).toHaveBeenCalledTimes(1);
    expect(assertDocumentsComplete).toHaveBeenCalledTimes(1);
  });

  it("si falta algo, la aprobación se corta antes de tocar el negocio", async () => {
    findFirst.mockResolvedValue({ id: "b1", isDemo: false, status: "PENDING" });
    assertDocumentsComplete.mockRejectedValueOnce(new Error("faltan documentos"));

    await expect(updateAdminBusiness("b1", { status: "APPROVED" }, "admin1")).rejects.toThrow("faltan documentos");
    expect(update).not.toHaveBeenCalled();
  });

  it("REACTIVAR un negocio suspendido no exige acuerdo ni documentos (ya fue aprobado antes)", async () => {
    findFirst.mockResolvedValue({ id: "b1", isDemo: false, status: "SUSPENDED" });
    await updateAdminBusiness("b1", { status: "APPROVED" }, "admin1");

    expect(assertCanBeApproved).not.toHaveBeenCalled();
    expect(assertDocumentsComplete).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("suspender o cambiar la comisión tampoco exige nada", async () => {
    findFirst.mockResolvedValue({ id: "b1", isDemo: false, status: "APPROVED" });
    await updateAdminBusiness("b1", { status: "SUSPENDED" }, "admin1");
    await updateAdminBusiness("b1", { commissionRate: 5 }, "admin1");

    expect(assertCanBeApproved).not.toHaveBeenCalled();
    expect(assertDocumentsComplete).not.toHaveBeenCalled();
  });
});
