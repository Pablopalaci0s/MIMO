import { describe, expect, it } from "vitest";
import { adminBannerInputSchema, adminCategoryInputSchema, adminUserUpdateSchema } from "./admin";

describe("adminCategoryInputSchema", () => {
  const valid = { name: "Flores", slug: "flores", position: 0 };

  it("acepta un slug en minúsculas/números/guiones", () => {
    expect(() => adminCategoryInputSchema.parse({ ...valid, slug: "cajas-de-regalo-2" })).not.toThrow();
  });

  it("rechaza un slug con mayúsculas, espacios o acentos", () => {
    expect(() => adminCategoryInputSchema.parse({ ...valid, slug: "Flores" })).toThrow();
    expect(() => adminCategoryInputSchema.parse({ ...valid, slug: "cajas de regalo" })).toThrow();
    expect(() => adminCategoryInputSchema.parse({ ...valid, slug: "cajón" })).toThrow();
  });

  it("parentId es opcional y nullable (categoría raíz)", () => {
    expect(() => adminCategoryInputSchema.parse({ ...valid, parentId: null })).not.toThrow();
    expect(() => adminCategoryInputSchema.parse(valid)).not.toThrow();
  });
});

describe("adminUserUpdateSchema", () => {
  it("todos los campos son opcionales — un PATCH parcial es válido", () => {
    expect(() => adminUserUpdateSchema.parse({})).not.toThrow();
  });

  it("rechaza un rol fuera de USER/BUSINESS/ADMIN", () => {
    expect(() => adminUserUpdateSchema.parse({ role: "SUPERADMIN" })).toThrow();
  });
});

describe("adminBannerInputSchema", () => {
  const valid = {
    title: "Envío gratis en San Salvador",
    imageUrl: "https://example.com/banner.png",
    isActive: true,
    position: 0,
  };

  it("acepta sin linkUrl (banner informativo)", () => {
    expect(() => adminBannerInputSchema.parse(valid)).not.toThrow();
  });

  it("acepta una ruta interna o una URL externa completa", () => {
    expect(() => adminBannerInputSchema.parse({ ...valid, linkUrl: "/regalos?categoria=flores" })).not.toThrow();
    expect(() => adminBannerInputSchema.parse({ ...valid, linkUrl: "https://wa.me/50370000000" })).not.toThrow();
  });

  it("rechaza un linkUrl que no es ni ruta interna ni URL completa", () => {
    expect(() => adminBannerInputSchema.parse({ ...valid, linkUrl: "regalos" })).toThrow();
  });

  it("rechaza imageUrl que no es una URL", () => {
    expect(() => adminBannerInputSchema.parse({ ...valid, imageUrl: "no-es-url" })).toThrow();
  });
});
