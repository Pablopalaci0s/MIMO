import { NextRequest } from "next/server";
import { apiErrorFromException } from "@/lib/api-response";
import { toCsv } from "@/lib/csv";
import { listBusinessOrderItems } from "@/lib/services/business-order-service";
import { requireBusinessId } from "@/lib/services/business-service";
import type { OrderItemStatus } from "@mimo/database";

const VALID_STATUSES: OrderItemStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const HEADER = [
  "Pedido",
  "Fecha del pedido",
  "Producto",
  "Cantidad",
  "Precio unitario",
  "Total línea",
  "Estado",
  "Comprador",
  "Teléfono comprador",
  "Destinatario",
  "Teléfono destinatario",
  "Dirección",
  "Municipio",
  "Fecha de entrega",
  "Horario de entrega",
];

/**
 * Los negocios chicos llevan sus cuentas en Excel — esto les da un CSV de
 * sus pedidos sin tener que copiar a mano de la pantalla. Respeta el mismo
 * filtro de estado que la vista de `/negocio/pedidos`.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as OrderItemStatus)
        ? (statusParam as OrderItemStatus)
        : undefined;

    const items = await listBusinessOrderItems(businessId, { status });

    const rows = [
      HEADER,
      ...items.map((item) => [
        item.orderNumber,
        new Date(item.createdAt).toLocaleString("es-SV"),
        item.productName,
        String(item.quantity),
        item.unitPrice.toFixed(2),
        (item.unitPrice * item.quantity).toFixed(2),
        item.status,
        item.buyerName,
        item.buyerPhone,
        item.recipientName,
        item.recipientPhone,
        item.addressLine,
        item.municipalityName ?? "",
        new Date(item.deliveryDate).toLocaleDateString("es-SV", { timeZone: "UTC" }),
        item.deliveryWindow,
      ]),
    ];

    // BOM al inicio para que Excel en Windows detecte UTF-8 y no rompa las
    // tildes/ñ — sin esto "María" sale como "MarÃ­a" al abrirlo.
    const csv = "﻿" + toCsv(rows);
    const filename = `pedidos-mimo-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
