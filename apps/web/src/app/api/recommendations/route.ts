import { NextRequest } from "next/server";
import { recommendGiftsInputSchema } from "@mimo/validation";
import { AIService } from "@mimo/ai";
import { auth } from "@mimo/auth";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";

const aiService = new AIService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const input = recommendGiftsInputSchema.parse(body);

    const result = await aiService.recommendGifts(input, session?.user?.id);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
