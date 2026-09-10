import { NextRequest } from "next/server";
import { businessHoursInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getBusinessHours, updateBusinessHours } from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    const hours = await getBusinessHours(businessId);
    return apiSuccess(hours);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const body = await request.json();
    const input = businessHoursInputSchema.parse(body);

    const hours = await updateBusinessHours(businessId, input);
    return apiSuccess(hours);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
