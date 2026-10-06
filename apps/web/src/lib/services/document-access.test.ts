import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Un administrador SIN el permiso `canReviewDocuments` (y cualquiera que no
 * sea administrador) nunca debe poder ver, rechazar, borrar ni verificar los
 * documentos de identidad. Se prueba con el `requireDocumentReviewer` real y
 * con cada ruta real que toca esos documentos.
 */

class ForbiddenError extends Error {}
class UnauthorizedError extends Error {}

const auth = vi.fn();
const findUser = vi.fn();

vi.mock("@mimo/auth", () => ({
  auth,
  ForbiddenError,
  UnauthorizedError,
  assertRole: (role: string | undefined, allowed: string[]) => {
    if (!role) throw new UnauthorizedError("No autenticado");
    if (!allowed.includes(role)) throw new ForbiddenError("Sin permiso");
  },
}));
vi.mock("@mimo/database", () => ({ prisma: { user: { findUnique: findUser } } }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

// Los servicios que tocan los documentos: si alguna ruta llega a llamarlos
// sin permiso, el test falla.
const getBusinessDocumentFileForAdmin = vi.fn();
const rejectBusinessDocument = vi.fn();
const deleteAllBusinessDocuments = vi.fn();
const verifyIdentity = vi.fn();
vi.mock("@/lib/services/business-document-service", () => ({
  getBusinessDocumentFileForAdmin,
  rejectBusinessDocument,
  deleteAllBusinessDocuments,
}));
vi.mock("@/lib/services/identity-verification-service", () => ({ verifyIdentity }));

const { requireDocumentReviewer } = await import("@/lib/services/admin-service");
const viewRoute = await import("@/app/api/admin/negocios/[id]/documentos/[type]/route");
const rejectRoute = await import("@/app/api/admin/negocios/[id]/documentos/[type]/rechazar/route");
const deleteRoute = await import("@/app/api/admin/negocios/[id]/documentos/route");
const verifyRoute = await import("@/app/api/admin/negocios/[id]/verificacion/route");

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const VALID_VERIFY_BODY = {
  duiNumber: "04295342-7",
  documentLegible: true,
  documentValid: true,
  identityMatches: true,
  photoMatches: true,
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
}

/** Llama a las cuatro rutas y devuelve el status de cada una. */
async function callEveryRoute() {
  const view = await viewRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: ID, type: "DUI_FRONT" }) });
  const reject = await rejectRoute.POST(jsonRequest({ reason: "BLURRY" }) as never, {
    params: Promise.resolve({ id: ID, type: "DUI_FRONT" }),
  });
  const remove = await deleteRoute.DELETE(new Request("http://x", { method: "DELETE" }), {
    params: Promise.resolve({ id: ID }),
  });
  const verify = await verifyRoute.POST(jsonRequest(VALID_VERIFY_BODY) as never, { params: Promise.resolve({ id: ID }) });
  return { view: view.status, reject: reject.status, remove: remove.status, verify: verify.status };
}

function expectNoDocumentServiceWasTouched() {
  expect(getBusinessDocumentFileForAdmin).not.toHaveBeenCalled();
  expect(rejectBusinessDocument).not.toHaveBeenCalled();
  expect(deleteAllBusinessDocuments).not.toHaveBeenCalled();
  expect(verifyIdentity).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireDocumentReviewer", () => {
  it("un admin SIN el permiso es rechazado (403)", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    findUser.mockResolvedValue({ canReviewDocuments: false });
    await expect(requireDocumentReviewer()).rejects.toMatchObject({ code: "DOCUMENT_REVIEW_FORBIDDEN", status: 403 });
  });

  it("un admin con el permiso pasa", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    findUser.mockResolvedValue({ canReviewDocuments: true });
    await expect(requireDocumentReviewer()).resolves.toBe("a1");
  });

  it("quien no es admin (cliente, dueño de negocio, sin sesión) nunca pasa, aunque tuviera el flag", async () => {
    findUser.mockResolvedValue({ canReviewDocuments: true });
    for (const session of [{ user: { id: "u", role: "USER" } }, { user: { id: "b", role: "BUSINESS" } }, null]) {
      auth.mockResolvedValue(session);
      await expect(requireDocumentReviewer()).rejects.toThrow();
    }
  });

  it("el permiso se lee de la base en cada llamada: quitarlo surte efecto al instante", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    findUser.mockResolvedValueOnce({ canReviewDocuments: true }).mockResolvedValueOnce({ canReviewDocuments: false });
    await expect(requireDocumentReviewer()).resolves.toBe("a1");
    await expect(requireDocumentReviewer()).rejects.toMatchObject({ code: "DOCUMENT_REVIEW_FORBIDDEN" });
  });

  it("un usuario inexistente o borrado no pasa", async () => {
    auth.mockResolvedValue({ user: { id: "ghost", role: "ADMIN" } });
    findUser.mockResolvedValue(null);
    await expect(requireDocumentReviewer()).rejects.toMatchObject({ code: "DOCUMENT_REVIEW_FORBIDDEN" });
  });
});

describe("las cuatro rutas de documentos de identidad", () => {
  it("un admin sin permiso recibe 403 en TODAS y ningún servicio de documentos se ejecuta", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    findUser.mockResolvedValue({ canReviewDocuments: false });

    expect(await callEveryRoute()).toEqual({ view: 403, reject: 403, remove: 403, verify: 403 });
    expectNoDocumentServiceWasTouched();
  });

  it("un dueño de negocio (aunque abra el documento de su propio negocio por la ruta de admin) recibe 403", async () => {
    auth.mockResolvedValue({ user: { id: "b1", role: "BUSINESS" } });
    findUser.mockResolvedValue({ canReviewDocuments: true });

    expect(await callEveryRoute()).toEqual({ view: 403, reject: 403, remove: 403, verify: 403 });
    expectNoDocumentServiceWasTouched();
  });

  it("sin sesión recibe 401 en todas", async () => {
    auth.mockResolvedValue(null);
    expect(await callEveryRoute()).toEqual({ view: 401, reject: 401, remove: 401, verify: 401 });
    expectNoDocumentServiceWasTouched();
  });

  it("con el permiso, la misma ruta SÍ llega al servicio (el control es el permiso, no otra cosa)", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    findUser.mockResolvedValue({ canReviewDocuments: true });
    getBusinessDocumentFileForAdmin.mockResolvedValue({ data: Buffer.from([1, 2, 3]), mimeType: "image/png" });

    const response = await viewRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: ID, type: "DUI_FRONT" }) });
    expect(response.status).toBe(200);
    expect(getBusinessDocumentFileForAdmin).toHaveBeenCalledWith(ID, "DUI_FRONT", "a1");
  });
});
