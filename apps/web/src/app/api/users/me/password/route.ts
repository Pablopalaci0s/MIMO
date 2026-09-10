import { NextRequest } from "next/server";
import { passwordChangeSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { changeUserPassword } from "@/lib/services/user-service";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = passwordChangeSchema.parse(body);

    await changeUserPassword(session.user.id, input);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
