import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@mimo/database", () => ({ prisma: { business: { findUnique, update } } }));

const { PRIVACY_POLICY_VERSION } = await import("@/lib/legal/privacy");
const { acceptPrivacyPolicy, assertCurrentPrivacyVersion, assertPrivacyAccepted, hasAcceptedCurrentPrivacy } = await import(
  "./business-privacy-service"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("consentimiento a la política de privacidad", () => {
  it("rechaza una versión que no es la vigente", () => {
    expect(() => assertCurrentPrivacyVersion(PRIVACY_POLICY_VERSION)).not.toThrow();
    expect(() => assertCurrentPrivacyVersion("2000-01-01")).toThrow(/se actualizó/);
  });

  it("solo cuenta como aceptada la versión vigente", async () => {
    findUnique.mockResolvedValue({ privacyAcceptedVersion: PRIVACY_POLICY_VERSION });
    expect(await hasAcceptedCurrentPrivacy("b1")).toBe(true);

    findUnique.mockResolvedValue({ privacyAcceptedVersion: "2000-01-01" });
    expect(await hasAcceptedCurrentPrivacy("b1")).toBe(false);

    findUnique.mockResolvedValue({ privacyAcceptedVersion: null });
    expect(await hasAcceptedCurrentPrivacy("b1")).toBe(false);
  });

  it("assertPrivacyAccepted corta con un error claro si falta el consentimiento", async () => {
    findUnique.mockResolvedValue({ privacyAcceptedVersion: null });
    await expect(assertPrivacyAccepted("b1")).rejects.toMatchObject({ code: "PRIVACY_CONSENT_REQUIRED" });
  });

  it("aceptar guarda la versión y la fecha; con una versión vieja no guarda nada", async () => {
    await acceptPrivacyPolicy("b1", PRIVACY_POLICY_VERSION);
    expect(update.mock.calls[0]![0]).toMatchObject({
      where: { id: "b1" },
      data: { privacyAcceptedVersion: PRIVACY_POLICY_VERSION },
    });

    update.mockClear();
    await expect(acceptPrivacyPolicy("b1", "2000-01-01")).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});
