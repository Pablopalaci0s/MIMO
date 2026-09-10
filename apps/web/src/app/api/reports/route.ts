import { NextRequest } from "next/server";
import { reportInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createReport } from "@/lib/services/report-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = reportInputSchema.parse(body);

    const report = await createReport(session.user.id, input);
    return apiSuccess(report, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
