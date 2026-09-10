import { NextRequest } from "next/server";
import { deliveryCoverageCheckSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { checkDeliveryCoverage } from "@/lib/services/delivery-coverage-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = deliveryCoverageCheckSchema.parse(body);

    const results = await checkDeliveryCoverage(input.businessIds, input.municipalityId);
    return apiSuccess(results);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
