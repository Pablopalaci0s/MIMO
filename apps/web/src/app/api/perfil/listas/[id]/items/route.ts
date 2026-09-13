import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { addGiftRegistryItemSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { addRegistryItem } from "@/lib/services/gift-registry-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    const body = await request.json();
    const input = addGiftRegistryItemSchema.parse(body);

    const registry = await addRegistryItem(session.user.id, id, input);
    return apiSuccess(registry, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
