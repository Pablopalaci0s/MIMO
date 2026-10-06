import { describe, expect, it } from "vitest";
import {
  REQUIRED_BUSINESS_DOCUMENTS,
  businessDocumentTypeSchema,
  detectFileKind,
  formatRejectionReason,
  missingRequiredDocuments,
  rejectBusinessDocumentSchema,
} from "./business-documents";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("detectFileKind", () => {
  it("reconoce JPEG, PNG, WEBP y PDF por su contenido", () => {
    expect(detectFileKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(detectFileKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("png");
    expect(detectFileKind(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("webp");
    expect(detectFileKind(new TextEncoder().encode("%PDF-1.7\n"))).toBe("pdf");
  });

  it("rechaza un archivo que solo dice ser imagen (ej. un script o HTML renombrado)", () => {
    expect(detectFileKind(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectFileKind(new TextEncoder().encode("MZ executable"))).toBeNull();
  });

  it("no falla con archivos vacíos o demasiado cortos", () => {
    expect(detectFileKind(bytes())).toBeNull();
    expect(detectFileKind(bytes(0xff, 0xd8))).toBeNull();
    // RIFF sin la marca WEBP (ej. un .wav)
    expect(detectFileKind(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull();
  });
});

describe("missingRequiredDocuments", () => {
  it("pide DUI (frente y reverso) y la foto del titular", () => {
    expect(REQUIRED_BUSINESS_DOCUMENTS).toEqual(["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"]);
  });

  it("lista solo lo que falta; los opcionales no cuentan", () => {
    expect(missingRequiredDocuments([])).toEqual(["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"]);
    expect(missingRequiredDocuments(["DUI_FRONT", "TAX_ID"])).toEqual(["DUI_BACK", "OWNER_PHOTO"]);
    expect(missingRequiredDocuments(["DUI_FRONT", "DUI_BACK", "OWNER_PHOTO"])).toEqual([]);
  });
});

describe("businessDocumentTypeSchema", () => {
  it("solo acepta tipos conocidos", () => {
    expect(businessDocumentTypeSchema.parse("PERMIT")).toBe("PERMIT");
    expect(() => businessDocumentTypeSchema.parse("PASSPORT")).toThrow();
  });
});

describe("rejectBusinessDocumentSchema", () => {
  it("acepta un motivo predefinido, con o sin nota", () => {
    expect(rejectBusinessDocumentSchema.parse({ reason: "BLURRY" })).toEqual({ reason: "BLURRY" });
    expect(rejectBusinessDocumentSchema.parse({ reason: "INCOMPLETE", note: "  Se corta la esquina  " }).note).toBe(
      "Se corta la esquina",
    );
  });

  it("rechaza un motivo inventado", () => {
    expect(() => rejectBusinessDocumentSchema.parse({ reason: "NO_ME_GUSTA" })).toThrow();
    expect(() => rejectBusinessDocumentSchema.parse({})).toThrow();
  });

  it("'Otro motivo' exige explicar en la nota", () => {
    expect(() => rejectBusinessDocumentSchema.parse({ reason: "OTHER" })).toThrow();
    expect(() => rejectBusinessDocumentSchema.parse({ reason: "OTHER", note: "   " })).toThrow();
    expect(() => rejectBusinessDocumentSchema.parse({ reason: "OTHER", note: "Es de otra persona" })).not.toThrow();
  });

  it("limita la nota a 300 caracteres", () => {
    expect(() => rejectBusinessDocumentSchema.parse({ reason: "BLURRY", note: "a".repeat(301) })).toThrow();
  });
});

describe("formatRejectionReason", () => {
  it("arma el texto que lee el titular", () => {
    expect(formatRejectionReason({ reason: "BLURRY" })).toBe("La foto está borrosa o no se lee bien");
    expect(formatRejectionReason({ reason: "WRONG_DOCUMENT", note: "Subiste el reverso" })).toBe(
      "No corresponde al documento que se pide. Subiste el reverso",
    );
  });
});
