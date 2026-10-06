import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests de retención de los documentos de identidad contra una "base de
 * datos" falsa en memoria (con un evaluador de los filtros de Prisma que usa
 * el código), para probar que el borrado quita de verdad las filas — que es
 * donde viven los bytes de las imágenes — y no solo que se llamó a algo.
 */

type Row = Record<string, unknown>;

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-15T12:00:00Z");
const BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

/** Evalúa el subconjunto de `where` de Prisma que usan estos servicios. */
function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((branch) => matches(row, branch));
    const value = row[key];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime();
    if (typeof condition === "object") {
      const c = condition as Row;
      if ("lte" in c) return value instanceof Date && value.getTime() <= (c.lte as Date).getTime();
      if ("in" in c) return (c.in as unknown[]).includes(value);
      if ("some" in c) return Array.isArray(value) && value.length > 0;
      if ("not" in c) return value !== c.not;
      return false;
    }
    return value === condition;
  });
}

let documents: Row[] = [];
let verifications: Row[] = [];
let businesses: Row[] = [];
const auditCalls: Row[] = [];

const prisma = {
  businessDocument: {
    findUnique: vi.fn(async ({ where }: { where: { businessId_type: { businessId: string; type: string } } }) => {
      const key = where.businessId_type;
      return documents.find((d) => d.businessId === key.businessId && d.type === key.type) ?? null;
    }),
    deleteMany: vi.fn(async ({ where }: { where: Row }) => {
      const before = documents.length;
      documents = documents.filter((d) => !matches(d, where));
      return { count: before - documents.length };
    }),
  },
  identityVerification: {
    findMany: vi.fn(async ({ where }: { where: Row }) => verifications.filter((v) => matches(v, where))),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = verifications.find((v) => v.id === where.id)!;
      Object.assign(row, data);
      return row;
    }),
  },
  business: {
    findMany: vi.fn(async ({ where }: { where: Row }) =>
      businesses
        .filter((b) => matches({ ...b, documents: documents.filter((d) => d.businessId === b.id) }, where))
        .map((b) => ({ id: b.id })),
    ),
  },
};

vi.mock("@mimo/database", () => ({ prisma }));
vi.mock("./admin-audit-service", () => ({
  logAdminAction: vi.fn(async (call: Row) => {
    auditCalls.push(call);
  }),
}));
vi.mock("./notification-service", () => ({ createNotification: vi.fn() }));
vi.mock("./business-privacy-service", () => ({ assertPrivacyAccepted: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api-response", () => ({
  apiError: (code: string, message: string, status: number) => ({ status, body: { code, message } }),
  apiErrorFromException: (error: { code?: string; status?: number; message: string }) => ({
    status: error.status ?? 500,
    body: { code: error.code, message: error.message },
  }),
  apiSuccess: (data: unknown, status = 200) => ({ status, body: data }),
}));
const requireBusinessId = vi.fn();
vi.mock("@/lib/services/business-service", () => ({ requireBusinessId }));

const { getBusinessDocumentFile, purgeExpiredBusinessDocuments, purgeVerifiedIdentityImages } = await import(
  "./business-document-service"
);
const { GET: ownerGet } = await import("@/app/api/negocio/documentos/[type]/route");

function seedBusiness(id: string, extra: Row = {}) {
  businesses.push({ id, status: "APPROVED", documentsPurgeAfter: null, deletedAt: null, ...extra });
  for (const type of ["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO", "TAX_ID"]) {
    documents.push({ businessId: id, type, mimeType: "image/png", data: BYTES, sizeBytes: BYTES.length });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  documents = [];
  verifications = [];
  businesses = [];
  auditCalls.length = 0;
  requireBusinessId.mockResolvedValue("b1");
});

describe("imágenes de un negocio verificado: 30 días", () => {
  function verifiedBusiness(purgeAfter: Date) {
    seedBusiness("b1");
    verifications.push({ id: "v1", businessId: "b1", imagesPurgeAfter: purgeAfter, imagesDeletedAt: null });
  }

  it("durante los 30 días las imágenes siguen disponibles para revisión y la purga no toca nada", async () => {
    verifiedBusiness(new Date(NOW.getTime() + 1 * DAY)); // vence mañana

    expect(await purgeVerifiedIdentityImages(NOW)).toEqual({ verifications: 0, documents: 0 });
    expect(documents).toHaveLength(4);
    expect((await getBusinessDocumentFile("b1", "DUI_FRONT"))?.data.length).toBe(BYTES.length);
    expect(auditCalls).toEqual([]);
  });

  it("vencido el plazo se eliminan LAS TRES imágenes (no solo una marca) y se conservan NIT/permisos", async () => {
    verifiedBusiness(new Date(NOW.getTime() - 1000)); // venció hace 1 segundo

    expect(await purgeVerifiedIdentityImages(NOW)).toEqual({ verifications: 1, documents: 3 });

    const remaining = documents.map((d) => d.type);
    expect(remaining).toEqual(["TAX_ID"]);
    // Los bytes ya no están en ninguna fila de la "tabla".
    expect(documents.some((d) => d.data === BYTES && String(d.type).startsWith("DUI"))).toBe(false);
    expect(documents.some((d) => d.type === "OWNER_PHOTO")).toBe(false);
    // El registro de verificación se conserva y anota cuándo se borraron.
    expect(verifications[0]!.imagesDeletedAt).toEqual(NOW);
  });

  it("la ejecución queda en la auditoría como acción del sistema (sin admin) y no es repetible", async () => {
    verifiedBusiness(new Date(NOW.getTime() - 1000));

    await purgeVerifiedIdentityImages(NOW);
    expect(auditCalls).toEqual([
      expect.objectContaining({
        adminId: null,
        action: "business.identity.images_deleted",
        targetId: "b1",
        metadata: { verificationId: "v1", deleted: 3 },
      }),
    ]);

    // Una segunda corrida no vuelve a hacer nada (ya está marcada como borrada).
    auditCalls.length = 0;
    expect(await purgeVerifiedIdentityImages(new Date(NOW.getTime() + DAY))).toEqual({ verifications: 0, documents: 0 });
    expect(auditCalls).toEqual([]);
  });

  it("una verificación reemplazada (sin calendario de borrado) no borra nada por su cuenta", async () => {
    seedBusiness("b1");
    verifications.push({ id: "old", businessId: "b1", imagesPurgeAfter: null, imagesDeletedAt: null });
    expect(await purgeVerifiedIdentityImages(NOW)).toEqual({ verifications: 0, documents: 0 });
    expect(documents).toHaveLength(4);
  });
});

describe("después de la purga no existe una URL funcional para las imágenes", () => {
  it("el servicio ya no devuelve el archivo y la ruta del titular responde 404", async () => {
    seedBusiness("b1");
    verifications.push({ id: "v1", businessId: "b1", imagesPurgeAfter: new Date(NOW.getTime() - 1), imagesDeletedAt: null });

    // Antes de la purga la URL funciona.
    const before = await ownerGet(new Request("http://x"), { params: Promise.resolve({ type: "DUI_FRONT" }) });
    expect((before as Response).status).toBe(200);

    await purgeVerifiedIdentityImages(NOW);

    expect(await getBusinessDocumentFile("b1", "DUI_FRONT")).toBeNull();
    for (const type of ["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"]) {
      const after = (await ownerGet(new Request("http://x"), { params: Promise.resolve({ type }) })) as unknown as {
        status: number;
      };
      expect(after.status).toBe(404);
    }
    // El NIT, que no se purga, sigue disponible.
    expect(((await ownerGet(new Request("http://x"), { params: Promise.resolve({ type: "TAX_ID" }) })) as Response).status).toBe(200);
  });
});

describe("negocios rechazados y dados de baja siguen con sus plazos", () => {
  it("un rechazado se purga cuando vence su plazo, no antes", async () => {
    seedBusiness("early", { status: "REJECTED", documentsPurgeAfter: new Date(NOW.getTime() + 2 * DAY) });
    seedBusiness("due", { status: "REJECTED", documentsPurgeAfter: new Date(NOW.getTime() - 1000) });

    expect(await purgeExpiredBusinessDocuments(NOW)).toEqual({ businesses: 1, documents: 4 });
    expect(documents.filter((d) => d.businessId === "early")).toHaveLength(4);
    expect(documents.filter((d) => d.businessId === "due")).toHaveLength(0);
    expect(auditCalls).toEqual([
      expect.objectContaining({ adminId: null, action: "business.documents.purged", targetId: "due" }),
    ]);
  });

  it("un dado de baja se purga a los 90 días: a los 89 no, a los 91 sí", async () => {
    seedBusiness("d89", { deletedAt: new Date(NOW.getTime() - 89 * DAY) });
    seedBusiness("d91", { deletedAt: new Date(NOW.getTime() - 91 * DAY) });

    await purgeExpiredBusinessDocuments(NOW);
    expect(documents.filter((d) => d.businessId === "d89")).toHaveLength(4);
    expect(documents.filter((d) => d.businessId === "d91")).toHaveLength(0);
  });

  it("un negocio activo o suspendido NO se toca por estos plazos", async () => {
    seedBusiness("active");
    seedBusiness("suspended", { status: "SUSPENDED" });
    expect(await purgeExpiredBusinessDocuments(NOW)).toEqual({ businesses: 0, documents: 0 });
    expect(documents).toHaveLength(8);
  });

  it("el plazo de un rechazado NO se mezcla con el de verificados: cada purga usa el suyo", async () => {
    seedBusiness("rejected", { status: "REJECTED", documentsPurgeAfter: new Date(NOW.getTime() + DAY) });
    verifications.push({ id: "v1", businessId: "rejected", imagesPurgeAfter: null, imagesDeletedAt: null });

    await purgeVerifiedIdentityImages(NOW);
    await purgeExpiredBusinessDocuments(NOW);
    expect(documents).toHaveLength(4);
  });
});
