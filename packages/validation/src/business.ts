import { z } from "zod";
import { WEEK_DAYS } from "@mimo/types";

export const orderItemStatusUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
});

export const businessProductImageSchema = z.object({
  url: z.string().trim().url("URL de imagen inválida"),
  altText: z.string().trim().max(200).optional(),
});

export const businessProductInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  description: z.string().trim().min(10, "Mínimo 10 caracteres").max(2000),
  price: z.coerce.number().positive("El precio debe ser mayor a 0").max(10000),
  compareAtPrice: z.coerce.number().positive().max(10000).optional().nullable(),
  categoryId: z.string().uuid("Selecciona una categoría"),
  stock: z.coerce.number().int().min(0).max(100000),
  isPersonalizable: z.boolean(),
  availableToday: z.boolean(),
  preparationTimeMinutes: z.coerce.number().int().min(5).max(1440),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  images: z.array(businessProductImageSchema).min(1, "Agregá al menos una imagen").max(8),
});

const dayHoursSchema = z.union([z.tuple([z.string(), z.string()]), z.null()]);

export const businessHoursInputSchema = z.object({
  preparationTimeMinutes: z.coerce.number().int().min(5).max(1440),
  openingHours: z.object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  } satisfies Record<(typeof WEEK_DAYS)[number], typeof dayHoursSchema>),
});

export const businessDeliveryZoneInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  municipalityId: z.string().uuid().optional().nullable(),
  deliveryFee: z.coerce.number().min(0).max(500),
  estimatedMinutes: z.coerce.number().int().min(10).max(1440),
  isActive: z.boolean(),
});

export type BusinessProductInputParsed = z.infer<typeof businessProductInputSchema>;
export type BusinessHoursInputParsed = z.infer<typeof businessHoursInputSchema>;
export type BusinessDeliveryZoneInputParsed = z.infer<typeof businessDeliveryZoneInputSchema>;
