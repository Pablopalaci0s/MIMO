import { NextRequest } from "next/server";
import { businessDeliveryZoneInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import {
  deleteBusinessDeliveryZone,
  updateBusinessDeliveryZone,
} from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { id } = await params;
    const body = await request.json();
    const input = businessDeliveryZoneInputSchema.parse(body);

    const zone = await updateBusinessDeliveryZone(businessId, id, input);
    return apiSuccess(zone);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { id } = await params;
    await deleteBusinessDeliveryZone(businessId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
