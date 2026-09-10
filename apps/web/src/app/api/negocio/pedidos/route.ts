import { NextRequest } from "next/server";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
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

export async function GET(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as OrderItemStatus)
        ? (statusParam as OrderItemStatus)
        : undefined;

    const items = await listBusinessOrderItems(businessId, { status });
    return apiSuccess(items);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
