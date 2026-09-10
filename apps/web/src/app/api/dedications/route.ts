import { NextRequest } from "next/server";
import { generateDedicationInputSchema } from "@mimo/validation";
import { AIService } from "@mimo/ai";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";

const aiService = new AIService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = generateDedicationInputSchema.parse(body);

    const result = await aiService.generateDedication(input);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
