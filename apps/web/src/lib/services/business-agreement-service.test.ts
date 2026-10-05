import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();

vi.mock("@mimo/database", () => ({
  prisma: { businessAgreementAcceptance: { findUnique, upsert } },
}));

const { BUSINESS_AGREEMENT_VERSION } = await import("@/lib/legal/business-agreement");
const { acceptAgreement, assertCanBeApproved, assertCurrentAgreementVersion, hasAcceptedCurrentAgreement } =
  await import("./business-agreement-service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertCurrentAgreementVersion", () => {
  it("acepta la versión vigente", () => {
    expect(() => assertCurrentAgreementVersion(BUSINESS_AGREEMENT_VERSION)).not.toThrow();
  });

  it("rechaza una versión vieja (la página quedó abierta mientras se publicaba otra)", () => {
    expect(() => assertCurrentAgreementVersion("2000-01-01")).toThrow(/se actualizó/);
  });
});

describe("acceptAgreement", () => {
  it("registra quién aceptó qué versión, sin pisar una aceptación anterior de la misma versión", async () => {
    await acceptAgreement("b1", "u1", BUSINESS_AGREEMENT_VERSION);

    expect(upsert).toHaveBeenCalledWith({
      where: { businessId_version: { businessId: "b1", version: BUSINESS_AGREEMENT_VERSION } },
      create: { businessId: "b1", acceptedById: "u1", version: BUSINESS_AGREEMENT_VERSION },
      update: {},
    });
  });

  it("no guarda nada si la versión no es la vigente", async () => {
    await expect(acceptAgreement("b1", "u1", "2000-01-01")).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("assertCanBeApproved", () => {
  it("bloquea aprobar un negocio real que no aceptó el acuerdo vigente", async () => {
    findUnique.mockResolvedValue(null);
    await expect(assertCanBeApproved({ id: "b1", isDemo: false })).rejects.toMatchObject({
      code: "AGREEMENT_PENDING",
    });
  });

  it("deja aprobar si ya lo aceptó", async () => {
    findUnique.mockResolvedValue({ id: "a1" });
    await expect(assertCanBeApproved({ id: "b1", isDemo: false })).resolves.toBeUndefined();
  });

  it("los negocios demo no necesitan aceptarlo (ni se consulta la base)", async () => {
    await expect(assertCanBeApproved({ id: "b1", isDemo: true })).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("hasAcceptedCurrentAgreement", () => {
  it("consulta por negocio y versión vigente", async () => {
    findUnique.mockResolvedValue(null);
    expect(await hasAcceptedCurrentAgreement("b1")).toBe(false);
    expect(findUnique.mock.calls[0]![0].where).toEqual({
      businessId_version: { businessId: "b1", version: BUSINESS_AGREEMENT_VERSION },
    });
  });
});
