import type { OrderDTO, ProductSummaryDTO } from "@mimo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrderByNumber = vi.fn();
const listMyOrders = vi.fn();
const listProducts = vi.fn();

vi.mock("@/lib/services/order-service", () => ({ getOrderByNumber, listMyOrders }));
vi.mock("@/lib/services/product-service", () => ({ listProducts }));

const { createToolRunner } = await import("./bot-tools");

const CATEGORIES = new Set(["flores", "chocolates"]);

function order(overrides: Partial<OrderDTO> = {}): OrderDTO {
  return {
    id: "o1",
    orderNumber: "MIMO-20260912-AB12C",
    status: "PREPARING",
    subtotal: 30,
    deliveryFee: 3,
    discountAmount: 0,
    couponCode: null,
    total: 33,
    currency: "USD",
    items: [
      {
        id: "i1",
        productId: "p1",
        productName: "Ramo de rosas",
        businessId: "b1",
        businessName: "Rosas del Valle",
        quantity: 1,
        unitPrice: 30,
        personalization: null,
        status: "PREPARING",
      },
    ],
    isSurpriseMode: false,
    payment: { provider: "PAYPAL", status: "PAID" },
    createdAt: "2026-09-12T10:00:00.000Z",
    ...overrides,
  };
}

function product(id: string, name: string): ProductSummaryDTO {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    price: 25,
    compareAtPrice: null,
    currency: "USD",
    coverImageUrl: null,
    business: {
      id: "b1",
      name: "Rosas del Valle",
      slug: "rosas",
      logoUrl: null,
      verified: true,
      isDemo: false,
      ratingAvg: 4.5,
      ratingCount: 10,
      municipalityName: null,
    },
    categorySlug: "flores",
    ratingAvg: 4.5,
    ratingCount: 10,
    availableToday: true,
    preparationTimeMinutes: 60,
    salesCount: 3,
  };
}

const page = (items: ProductSummaryDTO[]) => ({ items, page: 1, pageSize: 4, total: items.length, totalPages: 1 });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("get_order_status — autorización", () => {
  it("sin sesión no toca la base de datos y le dice al modelo que pida iniciar sesión", async () => {
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });
    const result = JSON.parse(await runner.execute("get_order_status", { order_number: "MIMO-20260912-AB12C" }));

    expect(result.error).toBe("SIN_SESION");
    expect(getOrderByNumber).not.toHaveBeenCalled();
    expect(listMyOrders).not.toHaveBeenCalled();
    expect(runner.outcome.order).toBeNull();
  });

  it("consulta SIEMPRE con el userId de la sesión, aunque el modelo intente pasar otro", async () => {
    getOrderByNumber.mockResolvedValue(order());
    const runner = createToolRunner({ userId: "usuario-de-la-sesion", categorySlugs: CATEGORIES });

    // Una inyección de prompt podría hacer que el modelo mande un user_id ajeno: el esquema no lo admite.
    await runner.execute("get_order_status", { order_number: "mimo-20260912-ab12c", user_id: "otro-usuario", buyerId: "otro" });

    expect(getOrderByNumber).toHaveBeenCalledTimes(1);
    expect(getOrderByNumber).toHaveBeenCalledWith("MIMO-20260912-AB12C", "usuario-de-la-sesion");
  });

  it("un pedido ajeno es indistinguible de uno que no existe (y no arma tarjeta)", async () => {
    getOrderByNumber.mockResolvedValue(null);
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    const result = JSON.parse(await runner.execute("get_order_status", { order_number: "MIMO-20260101-ZZZZZ" }));

    expect(result.error).toBe("NO_ENCONTRADO");
    expect(runner.outcome.order).toBeNull();
  });

  it("rechaza un número con formato inválido sin consultar nada", async () => {
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    const result = JSON.parse(await runner.execute("get_order_status", { order_number: "12345" }));

    expect(result.error).toBe("FORMATO_INVALIDO");
    expect(getOrderByNumber).not.toHaveBeenCalled();
  });

  it("sin número devuelve solo los últimos pedidos de la sesión", async () => {
    listMyOrders.mockResolvedValue([order({ orderNumber: "MIMO-20260912-AAAAA" }), order(), order(), order(), order()]);
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    const result = JSON.parse(await runner.execute("get_order_status", {}));

    expect(listMyOrders).toHaveBeenCalledWith("u1");
    expect(result.pedidos).toHaveLength(3);
  });

  it("nunca le pasa al modelo la dirección, el teléfono ni el correo del pedido", async () => {
    getOrderByNumber.mockResolvedValue(order());
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    const raw = await runner.execute("get_order_status", { order_number: "MIMO-20260912-AB12C" });

    for (const forbidden of ["address", "direccion", "phone", "telefono", "email", "correo", "buyer"]) {
      expect(raw.toLowerCase()).not.toContain(forbidden);
    }
    expect(runner.outcome.order?.orderNumber).toBe("MIMO-20260912-AB12C");
  });
});

describe("search_products", () => {
  it("ignora una categoría inventada pero respeta una real", async () => {
    listProducts.mockResolvedValue(page([product("p1", "Rosas rojas")]));
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });

    await runner.execute("search_products", { query: "rosas", category: "inventada" });
    expect(listProducts.mock.calls[0]![0]).toMatchObject({ categorySlug: undefined });

    await runner.execute("search_products", { query: "rosas", category: "flores" });
    expect(listProducts.mock.calls[1]![0]).toMatchObject({ categorySlug: "flores" });
  });

  it("si la frase completa no da resultados, prueba cada palabra suelta", async () => {
    listProducts
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([product("p1", "Rosas rojas")]));
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });

    await runner.execute("search_products", { query: "rosas baratas" });

    expect(listProducts.mock.calls.map((call) => call[0].query)).toEqual(["rosas baratas", "rosas"]);
    expect(runner.outcome.products).toHaveLength(1);
  });

  it("devuelve un mensaje claro cuando no hay nada, sin tarjetas", async () => {
    listProducts.mockResolvedValue(page([]));
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });
    const result = JSON.parse(await runner.execute("search_products", { query: "xyz" }));

    expect(result.resultados).toEqual([]);
    expect(runner.outcome.products).toEqual([]);
  });

  it("no repite tarjetas si el modelo busca dos veces lo mismo", async () => {
    listProducts.mockResolvedValue(page([product("p1", "Rosas rojas")]));
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });

    await runner.execute("search_products", { query: "rosas" });
    await runner.execute("search_products", { query: "rosas" });

    expect(runner.outcome.products).toHaveLength(1);
  });

  it("falla con un mensaje genérico (sin detalles internos) si los parámetros son inválidos", async () => {
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });
    await expect(runner.execute("search_products", { query: "" })).rejects.toThrow("Parámetros inválidos para search_products.");
    await expect(runner.execute("search_products", { query: "a".repeat(200) })).rejects.toThrow("Parámetros inválidos");
    expect(listProducts).not.toHaveBeenCalled();
  });
});

describe("escalate_to_human", () => {
  it("registra la escalada y le avisa al modelo qué decirle a una persona con sesión", async () => {
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    const reply = await runner.execute("escalate_to_human", { reason: "Cobro doble", summary: "Pidió reembolso del pedido X." });

    expect(runner.outcome.escalation).toEqual({ reason: "Cobro doble", summary: "Pidió reembolso del pedido X." });
    expect(reply).toContain("notificación");
  });

  it("para un visitante le avisa que la pantalla le va a pedir nombre y correo", async () => {
    const runner = createToolRunner({ userId: null, categorySlugs: CATEGORIES });
    const reply = await runner.execute("escalate_to_human", { reason: "Reclamo", summary: "Resumen del caso." });

    expect(reply).toContain("nombre y correo");
  });

  it("rechaza una escalada sin motivo o sin resumen", async () => {
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    await expect(runner.execute("escalate_to_human", { reason: "", summary: "algo" })).rejects.toThrow();
    await expect(runner.execute("escalate_to_human", { reason: "algo" })).rejects.toThrow();
    expect(runner.outcome.escalation).toBeNull();
  });
});

describe("herramientas desconocidas", () => {
  it("lanza un error en vez de ejecutar algo inesperado", async () => {
    const runner = createToolRunner({ userId: "u1", categorySlugs: CATEGORIES });
    await expect(runner.execute("delete_everything", {})).rejects.toThrow("Herramienta desconocida");
  });
});
