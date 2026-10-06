import type { ConverseTool } from "@mimo/ai";
import type { OrderDTO, ProductSummaryDTO, SupportOrderCardDTO, SupportProductCardDTO } from "@mimo/types";
import { z } from "zod";
import { getOrderByNumber, listMyOrders } from "@/lib/services/order-service";
import { listProducts } from "@/lib/services/product-service";
import { extractOrderNumber } from "./bot-rules";
import { INITIAL_CATEGORY_SLUGS } from "./ticket-rules";
import { ORDER_STATUS_LABEL, PAYMENT_PROVIDER_LABEL, PAYMENT_STATUS_LABEL } from "./labels";

/**
 * Herramientas que el modelo puede pedir. Regla de oro: el modelo propone,
 * el servidor dispone — lo que cada herramienta puede VER lo decide
 * `ToolContext` (que sale de la sesión, nunca de lo que escribió el modelo
 * ni la persona), así que ni una inyección de prompt exitosa puede leer los
 * pedidos de otra cuenta.
 */
export interface ToolContext {
  userId: string | null;
  /** Slugs de categorías reales — un slug inventado por el modelo se ignora. */
  categorySlugs: Set<string>;
}

export interface ToolOutcome {
  products: SupportProductCardDTO[];
  order: SupportOrderCardDTO | null;
  escalation: { reason: string; summary: string; category?: string } | null;
}

export const SUPPORT_TOOLS: ConverseTool[] = [
  {
    name: "search_products",
    description:
      "Busca productos del catálogo de MIMO por palabra clave y devuelve hasta 4 (el chat los muestra como tarjetas con foto y precio). Usá 1 o 2 palabras concretas, por ejemplo 'rosas' o 'chocolates'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Palabra o palabras clave del producto (máximo 80 caracteres)." },
        max_price: { type: "number", description: "Precio máximo en USD (opcional)." },
        category: { type: "string", description: "Slug de una categoría del catálogo (opcional)." },
        available_today: { type: "boolean", description: "Solo productos disponibles para entrega hoy (opcional)." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_order_status",
    description:
      "Consulta el estado de los pedidos de la persona que escribe. Sin 'order_number' devuelve sus últimos 3 pedidos. Solo funciona si inició sesión; solo puede ver sus propios pedidos.",
    inputSchema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "Número de pedido con formato MIMO-YYYYMMDD-XXXXX (opcional)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Pasa la conversación a una persona del equipo de soporte de MIMO. Usala cuando la persona lo pida, o cuando el caso no se pueda resolver con lo que sabés.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo en pocas palabras (ej. 'Cobro doble en un pedido')." },
        category: {
          type: "string",
          enum: [...INITIAL_CATEGORY_SLUGS],
          description:
            "Categoría que mejor describe el caso. Es solo una sugerencia para ordenar el ticket: la prioridad, los reembolsos y cualquier acción sobre dinero los decide siempre una persona del equipo.",
        },
        summary: {
          type: "string",
          description:
            "Resumen de 2 o 3 oraciones para quien va a atender: qué pasó, qué ya se le dijo o consultó, números de pedido.",
        },
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
  },
];

const searchProductsInput = z.object({
  query: z.string().trim().min(1).max(80),
  max_price: z.number().positive().max(100000).optional(),
  category: z.string().trim().max(60).optional(),
  available_today: z.boolean().optional(),
});

const orderStatusInput = z.object({ order_number: z.string().trim().max(40).optional() });

const escalateInput = z.object({
  category: z.enum(INITIAL_CATEGORY_SLUGS).optional(),
  reason: z.string().trim().min(3).max(300),
  summary: z.string().trim().min(3).max(800),
});

function toProductCard(product: ProductSummaryDTO): SupportProductCardDTO {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    imageUrl: product.coverImageUrl,
    businessName: product.business.name,
  };
}

export function toOrderCard(order: OrderDTO): SupportOrderCardDTO {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    paymentProvider: order.payment.provider,
    paymentStatus: order.payment.status,
    items: order.items.map((item) => ({
      productName: item.productName,
      businessName: item.businessName,
      quantity: item.quantity,
      status: item.status,
    })),
  };
}

/** Lo que el modelo ve de un pedido: estado, montos e ítems — nunca la
 * dirección, el teléfono ni el correo (no los necesita para ayudar). */
function describeOrder(order: OrderDTO) {
  return {
    numero: order.orderNumber,
    fecha: order.createdAt.slice(0, 10),
    estado: ORDER_STATUS_LABEL[order.status],
    total_usd: order.total,
    descuento_usd: order.discountAmount,
    metodo_de_pago: PAYMENT_PROVIDER_LABEL[order.payment.provider],
    estado_del_pago: PAYMENT_STATUS_LABEL[order.payment.status],
    productos: order.items.map((item) => ({
      nombre: item.productName,
      negocio: item.businessName,
      cantidad: item.quantity,
      estado: ORDER_STATUS_LABEL[item.status],
    })),
  };
}

/** `contains` del catálogo exige la frase completa seguida: si "rosas rojas"
 * no da nada, se prueba cada palabra suelta antes de rendirse. */
async function searchCatalog(input: z.infer<typeof searchProductsInput>, categorySlugs: Set<string>) {
  const categorySlug = input.category && categorySlugs.has(input.category) ? input.category : undefined;
  const words = input.query.split(/\s+/).filter((word) => word.length >= 3);
  const attempts = Array.from(new Set([input.query, ...words]));

  for (const query of attempts) {
    const result = await listProducts(
      {
        query,
        categorySlug,
        maxPrice: input.max_price,
        availableToday: input.available_today || undefined,
        sort: "rating",
      },
      { pageSize: 4 },
    );
    if (result.items.length > 0) return { items: result.items, total: result.total };
  }
  return { items: [], total: 0 };
}

export function createToolRunner(context: ToolContext) {
  const outcome: ToolOutcome = { products: [], order: null, escalation: null };

  async function execute(name: string, rawInput: unknown): Promise<string> {
    switch (name) {
      case "search_products": {
        const input = searchProductsInput.safeParse(rawInput);
        if (!input.success) throw new Error("Parámetros inválidos para search_products.");

        const { items, total } = await searchCatalog(input.data, context.categorySlugs);
        for (const item of items) {
          if (!outcome.products.some((card) => card.id === item.id)) outcome.products.push(toProductCard(item));
        }
        if (items.length === 0) {
          return JSON.stringify({ resultados: [], mensaje: "No hay productos que coincidan con esa búsqueda." });
        }
        return JSON.stringify({
          total_encontrados: total,
          resultados: items.map((item) => ({
            nombre: item.name,
            precio_usd: item.price,
            negocio: item.business.name,
            disponible_hoy: item.availableToday,
            calificacion: item.ratingCount > 0 ? Number(item.ratingAvg.toFixed(1)) : null,
            url: `/productos/${item.slug}`,
          })),
        });
      }

      case "get_order_status": {
        const input = orderStatusInput.safeParse(rawInput);
        if (!input.success) throw new Error("Parámetros inválidos para get_order_status.");

        if (!context.userId) {
          return JSON.stringify({
            error: "SIN_SESION",
            mensaje: "La persona no inició sesión: no se pueden consultar pedidos. Pedile que inicie sesión en /iniciar-sesion.",
          });
        }

        if (input.data.order_number) {
          const orderNumber = extractOrderNumber(input.data.order_number);
          if (!orderNumber) {
            return JSON.stringify({ error: "FORMATO_INVALIDO", mensaje: "El número de pedido debe verse así: MIMO-20260912-AB12C." });
          }
          // Filtra por comprador dentro del servicio: un número ajeno es
          // indistinguible de uno que no existe.
          const order = await getOrderByNumber(orderNumber, context.userId);
          if (!order) {
            return JSON.stringify({ error: "NO_ENCONTRADO", mensaje: "No hay ningún pedido con ese número en la cuenta de esta persona." });
          }
          outcome.order = toOrderCard(order);
          return JSON.stringify({ pedido: describeOrder(order) });
        }

        const orders = (await listMyOrders(context.userId)).slice(0, 3);
        if (orders.length === 0) {
          return JSON.stringify({ pedidos: [], mensaje: "Esta persona todavía no tiene pedidos." });
        }
        if (orders.length === 1) outcome.order = toOrderCard(orders[0]!);
        return JSON.stringify({ pedidos: orders.map(describeOrder) });
      }

      case "escalate_to_human": {
        const input = escalateInput.safeParse(rawInput);
        if (!input.success) throw new Error("Parámetros inválidos para escalate_to_human.");

        outcome.escalation = { reason: input.data.reason, summary: input.data.summary, category: input.data.category };
        return context.userId
          ? "Listo: la conversación pasa a una persona del equipo. Decile a la persona que va a seguir acá mismo, en este chat, y que le va a llegar una notificación cuando le respondan."
          : "Listo: la conversación pasa a una persona del equipo. Como no tiene sesión iniciada, el chat le va a pedir su nombre y correo para poder responderle: avisale eso y que la respuesta va a aparecer en este mismo chat.";
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  }

  return { tools: SUPPORT_TOOLS, execute, outcome };
}
