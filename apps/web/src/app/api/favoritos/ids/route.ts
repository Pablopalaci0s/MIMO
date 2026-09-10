import { auth } from "@mimo/auth";
import { apiSuccess } from "@/lib/api-response";
import { listFavoriteIds } from "@/lib/services/favorite-service";

// Sin sesión, ids vacíos en vez de 401 — el corazón de las cards debe poder
// pintarse igual (vacío) para un visitante no logueado, sin bloquear la carga.
export async function GET() {
  const session = await auth();
  if (!session?.user) return apiSuccess({ productIds: [], businessIds: [] });

  const ids = await listFavoriteIds(session.user.id);
  return apiSuccess(ids);
}
