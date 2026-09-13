import { Prisma, prisma } from "@mimo/database";
import type { CheckoutInputParsed } from "@mimo/validation";
import type { OrderDTO, OrderItemDTO, PersonalizationInput, ProductSummaryDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { parseUtcDateOnly, utcDateOnly } from "@/lib/date-utils";
import { validateCoupon } from "./coupon-service";
import { resolveDeliveryCoverage, sumDeliveryFees } from "./delivery-coverage-logic";
import { capturePaypalOrder } from "./paypal-service";
import { PRODUCT_LIST_INCLUDE, toProductSummaryDTO } from "./product-service";

const ORDER_INCLUDE = {
  items: { include: { product: { include: { business: true } } } },
  payment: true,
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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
    discountAmount: Number(order.discountAmount),
    couponCode: order.couponCode,
    total: Number(order.total),
    currency: order.currency,
    items,
    isSurpriseMode: order.isSurpriseMode,
    payment: { provider: order.payment!.provider, status: order.payment!.status },
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

interface OrderPricing {
  itemsData: {
    productId: string;
    businessId: string;
    quantity: number;
    unitPrice: number;
    personalization: Prisma.InputJsonValue | undefined;
  }[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  couponId: string | null;
  couponCode: string | null;
  total: number;
  businessIds: string[];
  /** Cuánto del total le corresponde a cada negocio (su subtotal + su
   * propio fee de envío) — la base para repartir un pago con PayPal. Ya
   * tiene descontada la parte proporcional del cupón (si hay uno), para
   * que ni un negocio ni la comisión de MIMO "absorban" todo el descuento
   * — ver README, "Diseño: cupones de descuento". */
  grossByBusiness: Map<string, number>;
}

/** Subtotal real (precios de la base de datos, no del carrito del cliente)
 * de un conjunto de ítems — sin envío ni cupón. Lo usa la vista previa de
 * un cupón en el checkout (`/api/coupons/apply`), que no necesita la
 * dirección de entrega para calcular cuánto descuenta. */
export async function computeCartSubtotal(
  items: Pick<CheckoutInputParsed, "items">["items"],
): Promise<number> {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE", deletedAt: null },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  let subtotal = 0;
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      throw new AppError(
        "PRODUCT_UNAVAILABLE",
        "Uno de los productos de tu carrito ya no está disponible. Actualizalo e intentá de nuevo.",
        409,
      );
    }
    subtotal += Number(product.price) * item.quantity;
  }
  return round2(subtotal);
}

/**
 * Recalcula precios, cobertura de entrega y fecha desde la base de datos —
 * nunca desde lo que mande el cliente. La usan tanto `createOrder` (pago en
 * efectivo o ya aprobado por PayPal) como la creación de la orden de PayPal
 * en el checkout (`/api/payments/paypal/order`), que necesita el mismo
 * total ANTES de que el comprador la apruebe.
 */
async function computeOrderPricing(
  userId: string,
  input: Pick<CheckoutInputParsed, "items" | "address" | "couponCode">,
): Promise<OrderPricing> {
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
  const deliveryDate = parseUtcDateOnly(input.address.deliveryDate);
  if (deliveryDate < utcDateOnly(new Date())) {
    throw new AppError("INVALID_DELIVERY_DATE", "La fecha de entrega no puede ser en el pasado.", 400);
  }

  const businessIds = [...new Set(products.map((product) => product.businessId))];
  const zones = await prisma.deliveryZone.findMany({
    where: {
      businessId: { in: businessIds },
      isActive: true,
      OR: [{ municipalityId: input.address.municipalityId }, { municipalityId: null }],
    },
  });
  const { feeByBusiness, uncoveredBusinessIds } = resolveDeliveryCoverage(
    businessIds,
    zones.map((zone) => ({
      businessId: zone.businessId,
      municipalityId: zone.municipalityId,
      deliveryFee: Number(zone.deliveryFee),
      estimatedMinutes: zone.estimatedMinutes,
    })),
  );

  // La cobertura es real, no un fee por defecto — si un negocio no
  // configuró una zona activa para este municipio, no puede entregar ahí.
  // El checkout ya chequea esto antes de dejar avanzar (/api/delivery/coverage),
  // esta es la validación de respaldo del lado del servidor.
  if (uncoveredBusinessIds.length > 0) {
    const uncoveredBusinesses = await prisma.business.findMany({
      where: { id: { in: uncoveredBusinessIds } },
      select: { name: true },
    });
    throw new AppError(
      "NO_DELIVERY_COVERAGE",
      `${uncoveredBusinesses.map((b) => b.name).join(", ")} no tiene cobertura de entrega para tu zona.`,
      409,
    );
  }

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

  const deliveryFee = sumDeliveryFees(businessIds, feeByBusiness);

  let discountAmount = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(prisma, userId, input.couponCode, subtotal);
    discountAmount = result.discountAmount;
    couponId = result.couponId;
    couponCode = result.code;
  }

  const total = round2(subtotal + deliveryFee - discountAmount);
  // El % del subtotal que "se fue" en descuento — se aplica por igual a
  // cada negocio para que nadie pague el cupón entero solo (ver README).
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

  const grossByBusiness = new Map<string, number>();
  for (const businessId of businessIds) {
    const itemsSubtotal = itemsData
      .filter((item) => item.businessId === businessId)
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const fee = feeByBusiness.get(businessId)?.deliveryFee ?? 0;
    const gross = itemsSubtotal * (1 - discountRatio) + fee;
    grossByBusiness.set(businessId, round2(gross));
  }

  return { itemsData, subtotal, deliveryFee, discountAmount, couponId, couponCode, total, businessIds, grossByBusiness };
}

/** Calcula el total de un carrito (y el descuento de un cupón, si hay uno)
 * para crear la orden de PayPal en el checkout, antes de que exista ningún
 * `Order` en MIMO. */
export async function getCheckoutTotal(
  userId: string,
  input: Pick<CheckoutInputParsed, "items" | "address" | "couponCode">,
): Promise<{ total: number; discountAmount: number }> {
  const pricing = await computeOrderPricing(userId, input);
  return { total: pricing.total, discountAmount: pricing.discountAmount };
}

/**
 * Crea un pedido a partir del carrito. El precio SIEMPRE se toma de la base
 * de datos (nunca del cliente) para que nadie pueda manipular el total.
 * Acepta efectivo contra entrega o PayPal (ya aprobado por el comprador) —
 * ver README, "Diseño: pagos con PayPal". PayPal cobra el total completo a
 * la cuenta de MIMO al momento del checkout (no hay split automático en el
 * cobro — MIMO no es "Partner" de PayPal); el reparto a cada negocio pasa
 * después, por negocio, cuando confirma su parte (`payment-split-service`).
 */
export async function createOrder(userId: string, input: CheckoutInputParsed): Promise<OrderDTO> {
  const pricing = await computeOrderPricing(userId, input);
  const { itemsData, subtotal, deliveryFee, discountAmount, couponId, couponCode, total, businessIds, grossByBusiness } =
    pricing;

  let paymentData: Prisma.PaymentCreateWithoutOrderInput;
  if (input.paymentProvider === "CASH") {
    paymentData = { provider: "CASH", status: "PENDING", amount: total };
  } else if (input.paymentProvider === "PAYPAL") {
    if (!input.paypalOrderId) {
      throw new AppError("PAYMENT_METHOD_UNAVAILABLE", "Falta la orden de PayPal aprobada.", 400);
    }
    const capture = await capturePaypalOrder(input.paypalOrderId);
    // El total pudo cambiar entre crear la orden de PayPal y este momento
    // (ej. un producto cambió de precio) — no confiamos en que coincidan
    // exactos, pero una diferencia real es una señal de que algo cambió y
    // no debemos crear el pedido con esos montos desalineados.
    if (Math.abs(capture.amount - total) > 0.01) {
      throw new AppError(
        "PAYMENT_AMOUNT_MISMATCH",
        "El monto cobrado no coincide con tu carrito actual. Contactá soporte antes de volver a intentar.",
        409,
      );
    }
    paymentData = {
      provider: "PAYPAL",
      status: "PAID",
      amount: total,
      providerOrderId: input.paypalOrderId,
      providerReference: capture.captureId,
      paidAt: new Date(),
    };
  } else {
    throw new AppError("PAYMENT_METHOD_UNAVAILABLE", "Ese método de pago todavía no está disponible.", 400);
  }

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
        discountAmount,
        couponCode,
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
            deliveryDate: parseUtcDateOnly(input.address.deliveryDate),
            deliveryWindow: input.address.deliveryWindow,
            deliveryInstructions: input.address.deliveryInstructions,
          },
        },
        payment: { create: paymentData },
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

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }

    if (input.paymentProvider === "PAYPAL") {
      const businesses = await tx.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true, commissionRate: true },
      });
      const rateByBusiness = new Map(businesses.map((b) => [b.id, Number(b.commissionRate)]));

      await tx.paymentSplit.createMany({
        data: businessIds.map((businessId) => {
          const gross = grossByBusiness.get(businessId) ?? 0;
          const rate = rateByBusiness.get(businessId) ?? 10;
          const commissionAmount = round2((gross * rate) / 100);
          return {
            paymentId: created.payment!.id,
            businessId,
            grossAmount: gross,
            commissionRate: rate,
            commissionAmount,
            netAmount: round2(gross - commissionAmount),
          };
        }),
      });
    }

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

/**
 * Productos distintos de compras anteriores del usuario, para la sección
 * "Volver a pedir" del home — nunca se muestra si el usuario no tiene
 * pedidos reales (sección 5 de las reglas del usuario: nada de datos falsos).
 */
export async function listRecentlyOrderedProducts(
  userId: string,
  limit = 6,
): Promise<ProductSummaryDTO[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { buyerId: userId }, product: { status: "ACTIVE", deletedAt: null } },
    include: { product: { include: PRODUCT_LIST_INCLUDE } },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });

  const seen = new Set<string>();
  const products: ProductSummaryDTO[] = [];
  for (const item of items) {
    if (seen.has(item.productId)) continue;
    seen.add(item.productId);
    products.push(toProductSummaryDTO(item.product));
    if (products.length >= limit) break;
  }
  return products;
}
