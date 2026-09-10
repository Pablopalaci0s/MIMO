import { NextRequest } from "next/server";
import { coverageRequestInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createCoverageRequest } from "@/lib/services/delivery-coverage-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const input = coverageRequestInputSchema.parse(body);

    const result = await createCoverageRequest(session?.user?.id, input);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
