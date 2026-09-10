import { NextRequest } from "next/server";
import { reviewInputSchema } from "@mimo/validation";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createReview, listApprovedReviews } from "@/lib/services/review-service";

export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
    const businessId = request.nextUrl.searchParams.get("businessId") ?? undefined;
    const reviews = await listApprovedReviews({ productId, businessId });
    return apiSuccess(reviews);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const body = await request.json();
    const input = reviewInputSchema.parse(body);

    const review = await createReview(session.user.id, input);
    return apiSuccess(review, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
