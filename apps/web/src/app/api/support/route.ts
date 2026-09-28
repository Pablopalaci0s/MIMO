import { NextRequest } from "next/server";
import { supportRequestSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { sendSupportRequest } from "@/lib/services/support-service";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "support-request", 3, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const input = supportRequestSchema.parse(body);

    await sendSupportRequest(input);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
