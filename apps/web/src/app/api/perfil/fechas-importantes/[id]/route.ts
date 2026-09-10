import { NextRequest } from "next/server";
import { importantDateInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { deleteImportantDate, updateImportantDate } from "@/lib/services/important-date-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    const body = await request.json();
    const input = importantDateInputSchema.parse(body);

    const date = await updateImportantDate(session.user.id, id, input);
    return apiSuccess(date);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    await deleteImportantDate(session.user.id, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
