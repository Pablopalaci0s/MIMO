import { NextRequest } from "next/server";
import { orderMessageInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listOrderMessages, sendOrderMessage } from "@/lib/services/order-message-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { orderNumber } = await params;
    const businessId = request.nextUrl.searchParams.get("businessId");
    if (!businessId) return apiError("VALIDATION_ERROR", "Falta businessId", 400);

    const messages = await listOrderMessages(orderNumber, businessId, session.user.id);
    return apiSuccess(messages);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { orderNumber } = await params;
    const body = await request.json();
    const input = orderMessageInputSchema.parse(body);

    const message = await sendOrderMessage(orderNumber, input.businessId, session.user.id, input.body);
    return apiSuccess(message, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
