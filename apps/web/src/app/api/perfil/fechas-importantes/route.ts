import { NextRequest } from "next/server";
import { importantDateInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createImportantDate, listImportantDates } from "@/lib/services/important-date-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const dates = await listImportantDates(session.user.id);
    return apiSuccess(dates);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = importantDateInputSchema.parse(body);

    const date = await createImportantDate(session.user.id, input);
    return apiSuccess(date, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
