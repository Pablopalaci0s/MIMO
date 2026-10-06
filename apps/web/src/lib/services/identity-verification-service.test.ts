import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** DUI de ejemplo con dígito verificador correcto. Si este texto aparece en
 * cualquier lugar donde se persiste algo, es un bug. */
const DUI = "04295342-7";
const DUI_DIGITS = "042953427";
const SECRET = "s".repeat(40);

const businessFindFirst = vi.fn();
const documentFindMany = vi.fn();
const verificationFindMany = vi.fn();
const verificationUpdateMany = vi.fn();
const verificationCreate = vi.fn();
const verificationDelete = vi.fn();
const logAdminAction = vi.fn();
const updateAdminBusiness = vi.fn();
const assertCanBeApproved = vi.fn();

const prisma: Record<string, unknown> = {
  business: { findFirst: businessFindFirst },
  businessDocument: { findMany: documentFindMany },
  identityVerification: {
    findMany: verificationFindMany,
    updateMany: verificationUpdateMany,
    create: verificationCreate,
    delete: verificationDelete,
  },
  $transaction: async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
};

vi.mock("@mimo/database", () => ({ prisma }));
vi.mock("./admin-audit-service", () => ({ logAdminAction }));
vi.mock("./admin-business-service", () => ({ updateAdminBusiness }));
vi.mock("./business-agreement-service", () => ({ assertCanBeApproved }));

const { computeDuiFingerprint, verifyIdentity, DUI_FINGERPRINT_VERSION } = await import("./identity-verification-service");
const { DOCUMENT_RETENTION_VERIFIED_DAYS } = await import("@/lib/legal/privacy");

const ALL_CRITERIA = { documentLegible: true, documentValid: true, identityMatches: true, photoMatches: true } as const;
const THREE_IMAGES = [{ type: "DUI_FRONT" }, { type: "DUI_BACK" }, { type: "OWNER_PHOTO" }];

function createdRow(data: Record<string, unknown>) {
  return {
    id: "v1",
    verifiedAt: data.verifiedAt as Date,
    verifiedBy: { name: "Admin Autorizado" },
    reviewedDocuments: data.reviewedDocuments,
    documentLegible: true,
    documentValid: true,
    identityMatches: true,
    photoMatches: true,
    duiLast4: data.duiLast4,
    imagesPurgeAfter: data.imagesPurgeAfter as Date,
    imagesDeletedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DUI_FINGERPRINT_SECRET = SECRET;
  businessFindFirst.mockResolvedValue({ id: "b1", name: "Negocio", status: "PENDING", isDemo: false });
  documentFindMany.mockResolvedValue(THREE_IMAGES);
  verificationFindMany.mockResolvedValue([]);
  verificationCreate.mockImplementation(async ({ data }) => createdRow(data));
  updateAdminBusiness.mockResolvedValue({});
});

describe("HMAC del DUI", () => {
  it("es HMAC-SHA256 con el secreto del servidor, no un SHA-256 simple", () => {
    const fingerprint = computeDuiFingerprint(DUI, SECRET);

    expect(fingerprint).toBe(createHmac("sha256", SECRET).update(`dui:v${DUI_FINGERPRINT_VERSION}:${DUI_DIGITS}`).digest("hex"));
    // Un SHA-256 simple del número permitiría recuperar el DUI probando los ~10^8 posibles.
    expect(fingerprint).not.toBe(createHash("sha256").update(DUI_DIGITS).digest("hex"));
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("es determinista y no depende de cómo se escriba el número", () => {
    expect(computeDuiFingerprint("04295342-7", SECRET)).toBe(computeDuiFingerprint("042953427", SECRET));
    expect(computeDuiFingerprint("04295342 7", SECRET)).toBe(computeDuiFingerprint("042953427", SECRET));
  });

  it("cambia con otro número y con otro secreto (sin el secreto no se puede reproducir)", () => {
    expect(computeDuiFingerprint("00000000-0", SECRET)).not.toBe(computeDuiFingerprint(DUI, SECRET));
    expect(computeDuiFingerprint(DUI, "t".repeat(40))).not.toBe(computeDuiFingerprint(DUI, SECRET));
  });

  it("sin secreto (o con uno corto) falla en vez de usar uno por defecto", () => {
    expect(() => computeDuiFingerprint(DUI, "")).toThrow(/DUI_FINGERPRINT_SECRET/);
    expect(() => computeDuiFingerprint(DUI, "corto")).toThrow(/DUI_FINGERPRINT_SECRET/);
    delete process.env.DUI_FINGERPRINT_SECRET;
    expect(() => computeDuiFingerprint(DUI)).toThrow(/DUI_FINGERPRINT_SECRET/);
  });
});

describe("registro de verificación", () => {
  it("guarda quién, cuándo, qué documentos y los cuatro criterios; programa el borrado a los 30 días", async () => {
    const result = await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");

    const data = verificationCreate.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      businessId: "b1",
      verifiedById: "admin1",
      reviewedDocuments: ["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"],
      documentLegible: true,
      documentValid: true,
      identityMatches: true,
      photoMatches: true,
      duiLast4: "3427",
      fingerprintVersion: DUI_FINGERPRINT_VERSION,
    });
    expect(data.duiFingerprint).toBe(computeDuiFingerprint(DUI, SECRET));
    expect(data.verifiedAt).toBeInstanceOf(Date);
    expect(data.imagesPurgeAfter.getTime() - data.verifiedAt.getTime()).toBe(DOCUMENT_RETENTION_VERIFIED_DAYS * 24 * 60 * 60 * 1000);

    expect(result).toMatchObject({ requiresConfirmation: false, approved: true });
    // Un negocio pendiente se aprueba al verificar.
    expect(updateAdminBusiness).toHaveBeenCalledWith("b1", { status: "APPROVED" }, "admin1");
  });

  it("deja en la auditoría tanto la verificación como CUÁNDO se programó el borrado", async () => {
    await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");

    const actions = logAdminAction.mock.calls.map((call) => call[0].action);
    expect(actions).toEqual(["business.identity.verify", "business.identity.purge_scheduled"]);
    const scheduled = logAdminAction.mock.calls[1]![0];
    expect(scheduled.metadata.days).toBe(DOCUMENT_RETENTION_VERIFIED_DAYS);
    expect(new Date(scheduled.metadata.purgeAfter).getTime()).toBeGreaterThan(Date.now());
  });

  it("un negocio que ya estaba aprobado solo registra la verificación (no lo vuelve a aprobar)", async () => {
    businessFindFirst.mockResolvedValue({ id: "b1", name: "Negocio", status: "APPROVED", isDemo: false });
    const result = await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");

    expect(result).toMatchObject({ approved: false });
    expect(updateAdminBusiness).not.toHaveBeenCalled();
    expect(verificationCreate).toHaveBeenCalledTimes(1);
  });

  it("una verificación nueva reemplaza el calendario de borrado de las anteriores", async () => {
    await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");
    expect(verificationUpdateMany).toHaveBeenCalledWith({
      where: { businessId: "b1", imagesDeletedAt: null },
      data: { imagesPurgeAfter: null },
    });
  });

  it("exige que estén subidas y vigentes las tres imágenes", async () => {
    documentFindMany.mockResolvedValue([{ type: "DUI_FRONT" }, { type: "OWNER_PHOTO" }]);
    await expect(verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1")).rejects.toMatchObject({
      code: "DOCUMENTS_PENDING",
    });
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("rechaza un DUI con dígito verificador incorrecto sin guardar nada", async () => {
    await expect(verifyIdentity("b1", { duiNumber: "04295342-8", ...ALL_CRITERIA }, "admin1")).rejects.toMatchObject({
      code: "INVALID_DUI",
    });
    expect(verificationCreate).not.toHaveBeenCalled();
  });

  it("si el negocio no se puede aprobar, no queda una verificación huérfana", async () => {
    updateAdminBusiness.mockRejectedValueOnce(new Error("no se pudo aprobar"));
    await expect(verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1")).rejects.toThrow("no se pudo aprobar");
    expect(verificationDelete).toHaveBeenCalledWith({ where: { id: "v1" } });
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});

describe("duplicados (para eso sirve la HMAC)", () => {
  const other = { business: { id: "b9", name: "Otro negocio", status: "SUSPENDED" } };

  it("si el mismo DUI ya está en otro negocio, pide confirmación y NO registra nada todavía", async () => {
    verificationFindMany.mockResolvedValue([other]);
    const result = await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");

    expect(result).toEqual({
      requiresConfirmation: true,
      duplicates: [{ businessId: "b9", businessName: "Otro negocio", businessStatus: "SUSPENDED" }],
    });
    expect(verificationCreate).not.toHaveBeenCalled();
    // Busca por huella (nunca por el número) y excluye al propio negocio.
    expect(verificationFindMany.mock.calls[0]![0].where).toEqual({
      duiFingerprint: computeDuiFingerprint(DUI, SECRET),
      businessId: { not: "b1" },
    });
  });

  it("con la confirmación del admin sí registra, y lo deja anotado en la auditoría", async () => {
    verificationFindMany.mockResolvedValue([other]);
    await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA, confirmDuplicate: true }, "admin1");

    expect(verificationCreate).toHaveBeenCalledTimes(1);
    expect(logAdminAction.mock.calls[0]![0].metadata.confirmedDuplicate).toBe(true);
  });
});

describe("el DUI completo NUNCA se persiste", () => {
  /** Todo lo que se le pasa a la base, a la auditoría o a otros servicios, y lo que se devuelve. */
  async function everythingThatLeaves() {
    const result = await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");
    return JSON.stringify([
      result,
      verificationCreate.mock.calls,
      verificationUpdateMany.mock.calls,
      verificationFindMany.mock.calls,
      logAdminAction.mock.calls,
      updateAdminBusiness.mock.calls,
      documentFindMany.mock.calls,
    ]);
  }

  it("ni el número con guion ni sin guion aparecen en nada de lo que se guarda, audita o devuelve", async () => {
    const leaked = await everythingThatLeaves();
    expect(leaked).not.toContain(DUI);
    expect(leaked).not.toContain(DUI_DIGITS);
    // Tampoco 8 de los 9 dígitos seguidos (el número sin el verificador).
    expect(leaked).not.toContain(DUI_DIGITS.slice(0, 8));
    // Lo único del número que sí se guarda:
    expect(leaked).toContain("3427"); // últimos 4
  });

  it("ni siquiera en el camino de duplicados", async () => {
    verificationFindMany.mockResolvedValue([{ business: { id: "b9", name: "X", status: "APPROVED" } }]);
    const result = await verifyIdentity("b1", { duiNumber: DUI, ...ALL_CRITERIA }, "admin1");
    const leaked = JSON.stringify([result, verificationFindMany.mock.calls, logAdminAction.mock.calls]);
    expect(leaked).not.toContain(DUI_DIGITS);
    expect(leaked).not.toContain(DUI);
  });

  it("el esquema de Prisma no tiene ninguna columna para el número completo", () => {
    const schema = readFileSync(path.resolve(__dirname, "../../../../../packages/database/prisma/schema.prisma"), "utf8");
    const model = schema.slice(schema.indexOf("model IdentityVerification {"));
    const body = model.slice(0, model.indexOf("\n}"));
    const fields = [...body.matchAll(/^\s+(\w+)\s+/gm)].map((match) => match[1]);

    const duiFields = fields.filter((field) => /dui/i.test(field));
    expect(duiFields.sort()).toEqual(["duiFingerprint", "duiLast4"]);

    // Y ningún otro modelo guarda un campo con pinta de número de DUI.
    const outsideModel = schema.replace(body, "");
    expect(outsideModel).not.toMatch(/^\s+dui\w*\s+String/im);
    expect(outsideModel).not.toMatch(/duiNumber|documentNumber|numeroDui/i);
  });
});
