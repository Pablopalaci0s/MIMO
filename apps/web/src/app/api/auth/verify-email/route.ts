import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { verifyEmail } from "@/lib/services/user-service";

const verifyEmailInputSchema = z.object({ token: z.string().trim().min(1) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = verifyEmailInputSchema.parse(body);

    await verifyEmail(input.token);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
