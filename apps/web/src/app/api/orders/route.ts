import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { checkoutInputSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createOrder, listMyOrders } from "@/lib/services/order-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const orders = await listMyOrders(session.user.id);
    return apiSuccess(orders);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = checkoutInputSchema.parse(body);
    const order = await createOrder(session.user.id, input);

    return apiSuccess(order, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
