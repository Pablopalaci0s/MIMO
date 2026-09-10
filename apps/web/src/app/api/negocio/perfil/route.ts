import { NextRequest } from "next/server";
import { businessProfileInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getBusinessProfile, updateBusinessProfile } from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    const profile = await getBusinessProfile(businessId);
    return apiSuccess(profile);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const body = await request.json();
    const input = businessProfileInputSchema.parse(body);

    const profile = await updateBusinessProfile(businessId, input);
    return apiSuccess(profile);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
