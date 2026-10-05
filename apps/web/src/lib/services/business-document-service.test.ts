import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const findMany = vi.fn();
const findUnique = vi.fn();
const logAdminAction = vi.fn();

vi.mock("@mimo/database", () => ({ prisma: { businessDocument: { upsert, findMany, findUnique } } }));
vi.mock("./admin-audit-service", () => ({ logAdminAction }));

const { assertDocumentsComplete, getBusinessDocumentFileForAdmin, saveBusinessDocument } = await import(
  "./business-document-service"
);

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
