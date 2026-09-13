import { z } from "zod";
import { imageUrlSchema } from "./business";

const rating = z.coerce.number().int().min(1).max(5);

export const reviewInputSchema = z
  .object({
    orderId: z.string().uuid(),
    productId: z.string().uuid().optional(),
    businessId: z.string().uuid().optional(),
    productRating: rating.optional(),
    businessRating: rating.optional(),
    deliveryRating: rating.optional(),
    comment: z.string().trim().max(1000).optional(),
    images: z.array(imageUrlSchema).max(4, "Máximo 4 fotos").optional(),
  })
  .refine(
    (value) => value.productRating !== undefined || value.businessRating !== undefined || value.deliveryRating !== undefined,
    { message: "Calificá al menos un aspecto (producto, negocio o entrega)." },
  )
  .refine((value) => value.productId !== undefined || value.businessId !== undefined, {
    message: "Falta indicar qué estás reseñando.",
  });

export type ReviewInputParsed = z.infer<typeof reviewInputSchema>;
