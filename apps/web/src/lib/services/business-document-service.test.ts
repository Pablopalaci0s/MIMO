import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const findMany = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const deleteMany = vi.fn();
const findBusinesses = vi.fn();
const findOwner = vi.fn();
const logAdminAction = vi.fn();
const createNotification = vi.fn();
const assertPrivacyAccepted = vi.fn();

vi.mock("@mimo/database", () => ({
  prisma: {
    businessDocument: { upsert, findMany, findUnique, update, deleteMany },
    businessUser: { findFirst: findOwner },
    business: { findMany: findBusinesses },
  },
}));
vi.mock("./admin-audit-service", () => ({ logAdminAction }));
vi.mock("./notification-service", () => ({ createNotification }));
vi.mock("./business-privacy-service", () => ({ assertPrivacyAccepted }));

const {
  assertDocumentsComplete,
  deleteAllBusinessDocuments,
  getBusinessDocumentFileForAdmin,
  getMissingDocuments,
  purgeExpiredBusinessDocuments,
  rejectBusinessDocument,
  saveBusinessDocument,
} = await import("./business-document-service");

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const PDF = Array.from(new TextEncoder().encode("%PDF-1.7 contenido"));

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  upsert.mockImplementation(async ({ create }) => ({ ...create, updatedAt: new Date("2026-10-05T12:00:00Z") }));
});

describe("saveBusinessDocument", () => {
  it("guarda una imagen válida con el tipo detectado en su contenido", async () => {
    const dto = await saveBusinessDocument("b1", "u1", "DUI_FRONT", file(JPEG, "dui.jpg", "image/jpeg"));

    expect(dto).toMatchObject({ type: "DUI_FRONT", mimeType: "image/jpeg", sizeBytes: JPEG.length });
    expect(upsert.mock.calls[0]![0].create).toMatchObject({ businessId: "b1", uploadedById: "u1" });
  });

  it("ignora el Content-Type que declara el navegador: manda el contenido real", async () => {
    // Un JPEG real que se declara como PNG se guarda (y se servirá) como JPEG.
    const dto = await saveBusinessDocument("b1", "u1", "DUI_BACK", file(JPEG, "x.png", "image/png"));
    expect(dto.mimeType).toBe("image/jpeg");
  });

  it("rechaza un archivo que solo se hace pasar por imagen (HTML/script renombrado)", async () => {
    const fake = Array.from(new TextEncoder().encode("<html><script>alert(1)</script></html>"));
    await expect(saveBusinessDocument("b1", "u1", "DUI_FRONT", file(fake, "dui.jpg", "image/jpeg"))).rejects.toMatchObject({
      code: "INVALID_TYPE",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("el DUI no acepta PDF, pero el permiso sí", async () => {
    await expect(saveBusinessDocument("b1", "u1", "DUI_FRONT", file(PDF, "dui.pdf", "application/pdf"))).rejects.toMatchObject({
      code: "INVALID_TYPE",
    });
    await expect(
      saveBusinessDocument("b1", "u1", "PERMIT", file(PDF, "permiso.pdf", "application/pdf")),
    ).resolves.toMatchObject({ mimeType: "application/pdf" });
  });

  it("rechaza archivos vacíos y los de más de 5MB", async () => {
    await expect(saveBusinessDocument("b1", "u1", "DUI_FRONT", file([], "v.jpg", "image/jpeg"))).rejects.toMatchObject({
      code: "INVALID_FILE",
    });
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    await expect(saveBusinessDocument("b1", "u1", "DUI_FRONT", big)).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("assertDocumentsComplete", () => {
  it("bloquea un negocio real que no subió los obligatorios y dice cuáles faltan", async () => {
    findMany.mockResolvedValue([{ type: "DUI_FRONT" }, { type: "TAX_ID" }]);
    await expect(assertDocumentsComplete({ id: "b1", isDemo: false })).rejects.toMatchObject({
      code: "DOCUMENTS_PENDING",
      message: expect.stringContaining("DUI — reverso"),
    });
  });

  it("deja pasar con los tres obligatorios, y a los negocios demo sin consultar", async () => {
    findMany.mockResolvedValue([{ type: "DUI_FRONT" }, { type: "DUI_BACK" }, { type: "OWNER_PHOTO" }]);
    await expect(assertDocumentsComplete({ id: "b1", isDemo: false })).resolves.toBeUndefined();

    findMany.mockClear();
    await expect(assertDocumentsComplete({ id: "b2", isDemo: true })).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("getBusinessDocumentFileForAdmin", () => {
  it("deja constancia en la auditoría de que el admin abrió el documento", async () => {
    findUnique.mockResolvedValue({ data: new Uint8Array(JPEG), mimeType: "image/jpeg" });
    const result = await getBusinessDocumentFileForAdmin("b1", "DUI_FRONT", "admin1");

    expect(result?.mimeType).toBe("image/jpeg");
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: "admin1", action: "business.document.view", targetId: "b1", metadata: { type: "DUI_FRONT" } }),
    );
  });

  it("no audita una vista que no ocurrió (documento inexistente)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getBusinessDocumentFileForAdmin("b1", "PERMIT", "admin1")).toBeNull();
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});

describe("rechazar un documento", () => {
  beforeEach(() => {
    findUnique.mockResolvedValue({ id: "d1" });
    findOwner.mockResolvedValue({ userId: "owner1" });
    update.mockImplementation(async ({ data }) => ({
      type: "DUI_FRONT",
      mimeType: "image/png",
      sizeBytes: 70,
      updatedAt: new Date("2026-10-05T12:00:00Z"),
      rejectionReason: data.rejectionReason,
    }));
  });

  it("guarda el motivo, avisa al titular con el enlace para subir otro y deja constancia", async () => {
    const dto = await rejectBusinessDocument("b1", "DUI_FRONT", { reason: "BLURRY", note: "No se lee el número" }, "admin1");

    expect(dto.rejectionReason).toBe("La foto está borrosa o no se lee bien. No se lee el número");
    expect(update.mock.calls[0]![0].data).toMatchObject({ rejectedById: "admin1" });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "owner1", linkHref: "/negocio/verificacion", body: expect.stringContaining("borrosa") }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "business.document.reject", targetId: "b1", metadata: { type: "DUI_FRONT", reason: "BLURRY" } }),
    );
  });

  it("no se puede rechazar un documento que no existe", async () => {
    findUnique.mockResolvedValue(null);
    await expect(rejectBusinessDocument("b1", "PERMIT", { reason: "BLURRY" }, "admin1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(update).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("un documento rechazado cuenta como no subido (no se consulta ninguno rechazado)", async () => {
    findMany.mockResolvedValue([{ type: "DUI_BACK" }, { type: "OWNER_PHOTO" }]);
    expect(await getMissingDocuments("b1")).toEqual(["DUI_FRONT"]);
    expect(findMany.mock.calls[0]![0].where).toEqual({ businessId: "b1", rejectedAt: null });
  });

  it("volver a subir limpia el rechazo", async () => {
    upsert.mockImplementation(async ({ update: u }) => ({ ...u, type: "DUI_FRONT", updatedAt: new Date() }));
    await saveBusinessDocument("b1", "u1", "DUI_FRONT", file(JPEG, "nuevo.jpg", "image/jpeg"));
    expect(upsert.mock.calls[0]![0].update).toMatchObject({ rejectedAt: null, rejectionReason: null, rejectedById: null });
  });
});

describe("consentimiento de privacidad", () => {
  it("sin aceptar la política NO se guarda ningún documento", async () => {
    assertPrivacyAccepted.mockRejectedValueOnce(Object.assign(new Error("acepta"), { code: "PRIVACY_CONSENT_REQUIRED" }));
    await expect(saveBusinessDocument("b1", "u1", "DUI_FRONT", file(JPEG, "dui.jpg", "image/jpeg"))).rejects.toMatchObject({
      code: "PRIVACY_CONSENT_REQUIRED",
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("borrado y retención", () => {
  it("borrar a pedido elimina todos los documentos y lo deja en la auditoría", async () => {
    deleteMany.mockResolvedValue({ count: 3 });
    expect(await deleteAllBusinessDocuments("b1", "admin1")).toEqual({ deleted: 3 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { businessId: "b1" } });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "business.document.delete", targetId: "b1", metadata: { deleted: 3 } }),
    );
  });

  it("la purga solo apunta a rechazados vencidos y a dados de baja hace más de 90 días", async () => {
    const now = new Date("2026-10-05T12:00:00Z");
    findBusinesses.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    deleteMany.mockResolvedValue({ count: 5 });

    expect(await purgeExpiredBusinessDocuments(now)).toEqual({ businesses: 2, documents: 5 });

    const where = findBusinesses.mock.calls[0]![0].where;
    expect(where.documents).toEqual({ some: {} });
    expect(where.OR[0]).toEqual({ status: "REJECTED", documentsPurgeAfter: { lte: now } });
    expect(where.OR[1].deletedAt.lte.toISOString()).toBe("2026-07-07T12:00:00.000Z"); // 90 días antes
    expect(deleteMany).toHaveBeenCalledWith({ where: { businessId: { in: ["b1", "b2"] } } });
  });

  it("si no hay nada vencido no borra nada (activos y suspendidos conservan sus documentos)", async () => {
    findBusinesses.mockResolvedValue([]);
    expect(await purgeExpiredBusinessDocuments()).toEqual({ businesses: 0, documents: 0 });
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
