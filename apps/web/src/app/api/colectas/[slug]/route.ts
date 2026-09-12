import { NextRequest } from "next/server";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getPublicGroupGift } from "@/lib/services/group-gift-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const gift = await getPublicGroupGift(slug);
    if (!gift) return apiError("NOT_FOUND", "No encontramos esa colecta.", 404);
    return apiSuccess(gift);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
