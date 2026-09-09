import { Prisma, prisma } from "@mimo/database";
import type { CheckoutInputParsed } from "@mimo/validation";
import type { OrderDTO, OrderItemDTO, PersonalizationInput } from "@mimo/types";
import { AppError } from "@/lib/errors";

const DEFAULT_DELIVERY_FEE = 3.5;

const ORDER_INCLUDE = {
  items: { include: { product: { include: { business: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function toOrderDTO(order: OrderWithItems): OrderDTO {
  const items: OrderItemDTO[] = order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    businessId: item.businessId,
    businessName: item.product.business.name,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    personalization: (item.personalization as PersonalizationInput | null) ?? null,
    status: item.status,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    currency: order.currency,
    items,
    isSurpriseMode: order.isSurpriseMode,
    createdAt: order.createdAt.toISOString(),
  };
}

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MIMO-${datePart}-${randomPart}`;
}

/**
 * Crea un pedido a partir del carrito. El precio SIEMPRE se toma de la base
 * de datos (nunca del cliente) para que nadie pueda manipular el total.
 * Solo acepta pago contra entrega por ahora — ver README, "Diseño: pagos y
 * seguimiento de pedidos".
 */
export async function createOrder(userId: string, input: CheckoutInputParsed): Promise<OrderDTO> {
  if (input.paymentProvider !== "CASH") {
    throw new AppError(
      "PAYMENT_METHOD_UNAVAILABLE",
      "Por ahora solo aceptamos pago contra entrega. Tarjeta y PayPal llegan pronto.",
      400,
    );
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE", deletedAt: null },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const item of input.items) {
    if (!productById.has(item.productId)) {
      throw new AppError(
        "PRODUCT_UNAVAILABLE",
        "Uno de los productos de tu carrito ya no está disponible. Actualizalo e intentá de nuevo.",
        409,
      );
    }
  }

  // Comparación por fecha calendario en UTC en ambos lados — "YYYY-MM-DD" ya
  // se interpreta como medianoche UTC, así que "hoy" debe calcularse igual
  // (medianoche UTC), no con setHours local, o un servidor en UTC-6 marca
  // el día de hoy como "pasado" (bug real encontrado probando el checkout).
  const deliveryDate = new Date(`${input.address.deliveryDate}T00:00:00Z`);
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (deliveryDate < todayUtc) {
    throw new AppError("INVALID_DELIVERY_DATE", "La fecha de entrega no puede ser en el pasado.", 400);
  }

  const businessIds = [...new Set(products.map((product) => product.businessId))];
  const zones = await prisma.deliveryZone.findMany({
    where: { businessId: { in: businessIds }, municipalityId: input.address.municipalityId, isActive: true },
  });
  const feeByBusiness = new Map(zones.map((zone) => [zone.businessId, Number(zone.deliveryFee)]));

  let subtotal = 0;
  const itemsData = input.items.map((item) => {
    const product = productById.get(item.productId)!;
    const unitPrice = Number(product.price);
    subtotal += unitPrice * item.quantity;
    return {
      productId: product.id,
      businessId: product.businessId,
      quantity: item.quantity,
      unitPrice,
      personalization: item.personalization as Prisma.InputJsonValue | undefined,
    };
  });

  const deliveryFee = businessIds.reduce(
    (sum, businessId) => sum + (feeByBusiness.get(businessId) ?? DEFAULT_DELIVERY_FEE),
    0,
  );
  const total = subtotal + deliveryFee;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        buyerId: userId,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        status: "PENDING",
        subtotal,
        deliveryFee,
        total,
        isSurpriseMode: input.isSurpriseMode,
        hideBuyerFromRecipient: input.hideBuyerFromRecipient,
        surpriseInstructions: input.surpriseInstructions,
        items: { create: itemsData },
        address: {
          create: {
            recipientName: input.address.recipientName,
            recipientPhone: input.address.recipientPhone,
            addressLine: input.address.addressLine,
            reference: input.address.reference,
            municipalityId: input.address.municipalityId,
            deliveryDate,
            deliveryWindow: input.address.deliveryWindow,
            deliveryInstructions: input.address.deliveryInstructions,
          },
        },
        payment: {
          create: {
            provider: "CASH",
            status: "PENDING",
            amount: total,
          },
        },
      },
      include: ORDER_INCLUDE,
    });

    await Promise.all(
      itemsData.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        }),
      ),
    );

    return created;
  });

  return toOrderDTO(order);
}

export async function getOrderByNumber(orderNumber: string, userId: string): Promise<OrderDTO | null> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, buyerId: userId },
    include: ORDER_INCLUDE,
  });
  return order ? toOrderDTO(order) : null;
}

export async function listMyOrders(userId: string): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrderDTO);
}
