import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { removeRegistryItem } from "@/lib/services/gift-registry-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id, itemId } = await params;
    await removeRegistryItem(session.user.id, id, itemId);
    return apiSuccess({ id: itemId });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
