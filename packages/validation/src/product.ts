import { z } from "zod";

export const productFiltersSchema = z.object({
  categoria: z.string().trim().min(1).optional(),
  ocasion: z.string().trim().min(1).optional(),
  emocion: z.string().trim().min(1).optional(),
  precioMin: z.coerce.number().min(0).optional(),
  precioMax: z.coerce.number().min(0).optional(),
  ubicacion: z.string().trim().min(1).optional(),
  disponibleHoy: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional(),
  orden: z.enum(["relevance", "price_asc", "price_desc", "rating", "sales"]).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
