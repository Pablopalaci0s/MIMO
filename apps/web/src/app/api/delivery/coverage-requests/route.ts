import { NextRequest } from "next/server";
import { coverageRequestInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { createCoverageRequest } from "@/lib/services/delivery-coverage-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    const limited = rateLimitResponse(request, "coverage-request", 10, 60 * 60 * 1000, session?.user?.id);
    if (limited) return limited;

    const body = await request.json();
    const input = coverageRequestInputSchema.parse(body);

    const result = await createCoverageRequest(session?.user?.id, input);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
