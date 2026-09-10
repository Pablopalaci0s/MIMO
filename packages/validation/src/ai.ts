import { z } from "zod";

export const recommendGiftsInputSchema = z.object({
  message: z.string().trim().min(3, "Contanos un poco más").max(500),
  personality: z.array(z.string()).max(10).optional(),
  sessionId: z.string().trim().min(1).max(100),
});

export type RecommendGiftsInputParsed = z.infer<typeof recommendGiftsInputSchema>;

export const generateDedicationInputSchema = z.object({
  tone: z.enum(["romantic", "funny", "formal", "short", "heartfelt"]),
  instructions: z.string().trim().max(300).optional(),
  recipientName: z.string().trim().max(100).optional(),
  occasion: z.string().trim().max(100).optional(),
});

export type GenerateDedicationInputParsed = z.infer<typeof generateDedicationInputSchema>;
