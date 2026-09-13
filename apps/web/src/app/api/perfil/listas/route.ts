import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { giftRegistryInputSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createRegistry, listMyRegistries } from "@/lib/services/gift-registry-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const registries = await listMyRegistries(session.user.id);
    return apiSuccess(registries);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = giftRegistryInputSchema.parse(body);

    const registry = await createRegistry(session.user.id, input);
    return apiSuccess(registry, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
