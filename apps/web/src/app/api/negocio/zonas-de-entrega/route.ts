import { NextRequest } from "next/server";
import { businessDeliveryZoneInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import {
  createBusinessDeliveryZone,
  listBusinessDeliveryZones,
} from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    const zones = await listBusinessDeliveryZones(businessId);
    return apiSuccess(zones);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const body = await request.json();
    const input = businessDeliveryZoneInputSchema.parse(body);

    const zone = await createBusinessDeliveryZone(businessId, input);
    return apiSuccess(zone, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
