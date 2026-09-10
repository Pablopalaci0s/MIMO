import { describe, expect, it } from "vitest";
import { productFiltersSchema } from "./product";

describe("productFiltersSchema", () => {
  it("todos los filtros son opcionales — sin query params es válido", () => {
    expect(() => productFiltersSchema.parse({})).not.toThrow();
  });

  it("transforma disponibleHoy/oferta de string 'true'/'false' a boolean", () => {
    const result = productFiltersSchema.parse({ disponibleHoy: "true", oferta: "false" });
    expect(result.disponibleHoy).toBe(true);
    expect(result.oferta).toBe(false);
  });

  it("rechaza disponibleHoy con un valor que no sea 'true'/'false'", () => {
    expect(() => productFiltersSchema.parse({ disponibleHoy: "si" })).toThrow();
  });

  it("coacciona precioMin/precioMax/page/pageSize de string a número", () => {
    const result = productFiltersSchema.parse({ precioMin: "10", precioMax: "50", page: "2", pageSize: "24" });
    expect(result).toMatchObject({ precioMin: 10, precioMax: 50, page: 2, pageSize: 24 });
  });

  it("rechaza un orden fuera del enum conocido", () => {
    expect(() => productFiltersSchema.parse({ orden: "mas_baratos" })).toThrow();
  });

  it("rechaza pageSize mayor a 60 (límite de paginación)", () => {
    expect(() => productFiltersSchema.parse({ pageSize: "61" })).toThrow();
  });
});
