import { NextRequest } from "next/server";
import { registerBusinessSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { applyAsBusiness } from "@/lib/services/business-application-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerBusinessSchema.parse(body);

    const result = await applyAsBusiness(input);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
