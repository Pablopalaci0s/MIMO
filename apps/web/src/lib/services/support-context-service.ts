import { prisma } from "@mimo/database";
import type {
  SupportBusinessCardDTO,
  SupportCustomerCardDTO,
  SupportOrderAddressDTO,
  SupportTicketOrderCardDTO,
} from "@mimo/types";
import { ticketCode } from "@/lib/support/ticket-rules";

/**
 * Contexto que el agente ve junto al ticket (ficha del cliente, tarjeta del
 * pedido, tarjeta del negocio) para no tener que preguntarle al cliente lo
 * que MIMO ya sabe. Todo es de SOLO LECTURA, reutiliza las entidades que ya
 * existen (nada se copia dentro del ticket) y devuelve únicamente lo
 * necesario: nunca contraseñas, tokens, documentos de identidad ni datos de
 * pago más allá del proveedor y el estado.
 *
 * Cada función hace un número fijo de consultas (sin N+1).
 */

const RECENT_LIMIT = 5;

export async function getCustomerCard(input: {
  customerId: string | null;
  currentTicketId: string;
  guestName: string | null;
  guestEmail: string | null;
}): Promise<SupportCustomerCardDTO> {
  if (!input.customerId) {
    return {
      isGuest: true,
      name: input.guestName ?? "Visitante",
      email: input.guestEmail,
      phone: null,
      memberSince: null,
      orderCount: 0,
      ticketCount: 1,
      recentOrders: [],
      previousTickets: [],
    };
  }

  const customerId = input.customerId;
  const [user, orderCount, ticketCount, recentOrders, previousTickets] = await Promise.all([
    // Solo estos campos: el resto del usuario (hash, tokens...) nunca se selecciona.
    prisma.user.findUnique({ where: { id: customerId }, select: { name: true, email: true, phone: true, createdAt: true } }),
    prisma.order.count({ where: { buyerId: customerId } }),
    prisma.supportTicket.count({ where: { customerId, kind: "CUSTOMER" } }),
    prisma.order.findMany({
      where: { buyerId: customerId },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: { orderNumber: true, status: true, total: true, createdAt: true },
    }),
    prisma.supportTicket.findMany({
      where: { customerId, kind: "CUSTOMER", id: { not: input.currentTicketId } },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, number: true, subject: true, status: true, createdAt: true },
    }),
  ]);

  return {
    isGuest: false,
    name: user?.name ?? input.guestName ?? "Cliente",
    email: user?.email ?? input.guestEmail,
    phone: user?.phone ?? null,
    memberSince: user?.createdAt.toISOString() ?? null,
    orderCount,
    ticketCount,
    recentOrders: recentOrders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
    })),
    previousTickets: previousTickets.map((ticket) => ({
      id: ticket.id,
      code: ticketCode(ticket.number),
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    })),
  };
}

/** Busca un pedido por su número (para vincularlo a un ticket) y de qué negocios son sus productos. */
export async function findOrderForLinking(orderNumber: string): Promise<{
  id: string;
  buyerId: string;
  businessIds: string[];
} | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, buyerId: true, items: { select: { businessId: true } } },
  });
  if (!order) return null;
  return { id: order.id, buyerId: order.buyerId, businessIds: [...new Set(order.items.map((item) => item.businessId))] };
}

export async function getTicketOrderCard(orderId: string, customerId: string | null): Promise<SupportTicketOrderCardDTO | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      createdAt: true,
      buyerId: true,
      buyerName: true,
      isSurpriseMode: true,
      payment: { select: { provider: true, status: true, paidAt: true } },
      items: {
        select: {
          quantity: true,
          status: true,
          updatedAt: true,
          product: { select: { name: true, business: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      // Solo el municipio: la dirección completa se revela aparte y queda auditada.
      address: { select: { municipality: { select: { name: true } } } },
    },
  });
  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    buyerName: order.buyerName,
    belongsToCustomer: customerId ? order.buyerId === customerId : null,
    isSurprise: order.isSurpriseMode,
    payment: order.payment
      ? { provider: order.payment.provider, status: order.payment.status, paidAt: order.payment.paidAt?.toISOString() ?? null }
      : null,
    items: order.items.map((item) => ({
      productName: item.product.name,
      businessName: item.product.business.name,
      quantity: item.quantity,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
    })),
    deliveryMunicipality: order.address?.municipality?.name ?? null,
    hasAddress: order.address !== null,
  };
}

/** La dirección completa de entrega. Quien llama es responsable de auditar el acceso. */
export async function getOrderAddress(orderId: string): Promise<SupportOrderAddressDTO | null> {
  const address = await prisma.orderAddress.findUnique({
    where: { orderId },
    select: {
      recipientName: true,
      recipientPhone: true,
      addressLine: true,
      reference: true,
      deliveryDate: true,
      deliveryWindow: true,
      deliveryInstructions: true,
      municipality: { select: { name: true, department: { select: { name: true } } } },
    },
  });
  if (!address) return null;
  return {
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    addressLine: address.addressLine,
    reference: address.reference,
    municipality: address.municipality?.name ?? null,
    department: address.municipality?.department.name ?? null,
    deliveryDate: address.deliveryDate.toISOString(),
    deliveryWindow: address.deliveryWindow,
    deliveryInstructions: address.deliveryInstructions,
  };
}

export async function getBusinessCard(businessId: string): Promise<SupportBusinessCardDTO | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      // Solo los datos de contacto que el propio negocio publica.
      phone: true,
      municipality: { select: { name: true } },
    },
  });
  if (!business) return null;
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    status: business.status,
    phone: business.phone,
    municipality: business.municipality?.name ?? null,
  };
}

/** Búsqueda de negocios por nombre para vincularlos a un ticket (máximo 8 resultados, solo datos básicos). */
export async function searchBusinessesForLinking(query: string): Promise<{ id: string; name: string; municipality: string | null }[]> {
  const rows = await prisma.business.findMany({
    where: { deletedAt: null, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true, municipality: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 8,
  });
  return rows.map((row) => ({ id: row.id, name: row.name, municipality: row.municipality?.name ?? null }));
}
