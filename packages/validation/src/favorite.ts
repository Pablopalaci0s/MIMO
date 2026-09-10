import { z } from "zod";

export const favoriteToggleInputSchema = z.object({
  targetType: z.enum(["PRODUCT", "BUSINESS"]),
  targetId: z.string().uuid(),
});

export type FavoriteToggleInputParsed = z.infer<typeof favoriteToggleInputSchema>;
