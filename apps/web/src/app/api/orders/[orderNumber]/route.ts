import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getOrderByNumber } from "@/lib/services/order-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { orderNumber } = await params;
    const order = await getOrderByNumber(orderNumber, session.user.id);
    if (!order) return apiError("NOT_FOUND", "Pedido no encontrado", 404);

    return apiSuccess(order);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
