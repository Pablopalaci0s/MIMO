import { NextRequest } from "next/server";
import { favoriteToggleInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listFavorites, toggleFavorite } from "@/lib/services/favorite-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const favorites = await listFavorites(session.user.id);
    return apiSuccess(favorites);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = favoriteToggleInputSchema.parse(body);

    const result = await toggleFavorite(session.user.id, input.targetType, input.targetId);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
