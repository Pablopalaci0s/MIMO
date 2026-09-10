import { z } from "zod";

export const recommendGiftsInputSchema = z.object({
  message: z.string().trim().min(3, "Contanos un poco más").max(500),
  personality: z.array(z.string()).max(10).optional(),
  sessionId: z.string().trim().min(1).max(100),
});

export type RecommendGiftsInputParsed = z.infer<typeof recommendGiftsInputSchema>;
