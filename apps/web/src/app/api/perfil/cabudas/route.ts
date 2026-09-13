import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { groupGiftInputSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createGroupGift, listMyGroupGifts } from "@/lib/services/group-gift-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const gifts = await listMyGroupGifts(session.user.id);
    return apiSuccess(gifts);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = groupGiftInputSchema.parse(body);

    const gift = await createGroupGift(session.user.id, input);
    return apiSuccess(gift, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
