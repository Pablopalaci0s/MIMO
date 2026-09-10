import { z } from "zod";

export const reportInputSchema = z.object({
  targetType: z.enum(["PRODUCT", "BUSINESS", "REVIEW", "USER"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3, "Contanos brevemente el motivo").max(120),
  description: z.string().trim().max(1000).optional(),
});

export type ReportInputParsed = z.infer<typeof reportInputSchema>;
