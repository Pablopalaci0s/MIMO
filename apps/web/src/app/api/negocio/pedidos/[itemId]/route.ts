import { NextRequest } from "next/server";
import { orderItemStatusUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { updateBusinessOrderItemStatus } from "@/lib/services/business-order-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { itemId } = await params;
    const body = await request.json();
    const { status } = orderItemStatusUpdateSchema.parse(body);

    const item = await updateBusinessOrderItemStatus(businessId, itemId, status);
    return apiSuccess(item);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
