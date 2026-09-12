import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { giftRegistryInputSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import {
  deleteRegistry,
  getRegistryForManage,
  updateRegistry,
} from "@/lib/services/gift-registry-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    const registry = await getRegistryForManage(session.user.id, id);
    return apiSuccess(registry);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    const body = await request.json();
    const input = giftRegistryInputSchema.parse(body);

    const registry = await updateRegistry(session.user.id, id, input);
    return apiSuccess(registry);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    await deleteRegistry(session.user.id, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
