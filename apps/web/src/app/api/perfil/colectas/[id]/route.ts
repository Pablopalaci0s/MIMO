import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { cancelGroupGift, finalizeGroupGift, getGroupGiftForManage } from "@/lib/services/group-gift-service";

const actionSchema = z.object({ action: z.enum(["finalize", "cancel"]) });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const { id } = await params;
    const gift = await getGroupGiftForManage(session.user.id, id);
    return apiSuccess(gift);
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
    const { action } = actionSchema.parse(body);

    const gift =
      action === "finalize"
        ? await finalizeGroupGift(session.user.id, id)
        : await cancelGroupGift(session.user.id, id);
    return apiSuccess(gift);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
