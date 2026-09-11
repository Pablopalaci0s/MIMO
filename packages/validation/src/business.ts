import { z } from "zod";
import { WEEK_DAYS } from "@mimo/types";

export const orderItemStatusUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
});

/** Acepta tanto una URL absoluta (http/https) como una ruta local propia
 * (`/uploads/...`, la que devuelve nuestro endpoint de subida de fotos) —
 * `z.string().url()` por sí solo rechazaría esa segunda forma. */
export const imageUrlSchema = z
  .string()
  .trim()
  .min(1, "URL de imagen inválida")
  .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), "URL de imagen inválida");

export const businessProductImageSchema = z.object({
  url: imageUrlSchema,
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

const salvadoranPhoneOptional = z
  .string()
  .trim()
  .regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido (8 dígitos)")
  .optional()
  .or(z.literal(""));

export const businessProfileInputSchema = z.object({
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: imageUrlSchema.optional().nullable(),
  coverUrl: imageUrlSchema.optional().nullable(),
  phone: salvadoranPhoneOptional,
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  instagram: z.string().trim().max(100).optional().or(z.literal("")),
  facebook: z.string().trim().max(100).optional().or(z.literal("")),
  tiktok: z.string().trim().max(100).optional().or(z.literal("")),
  addressLine: z.string().trim().min(5).max(255).optional().or(z.literal("")),
  // A dónde le mandamos su parte con PayPal Payouts cuando confirma un
  // pedido pagado con PayPal — ver "Diseño: pagos con PayPal" en el README.
  paypalEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
});

export type BusinessProductInputParsed = z.infer<typeof businessProductInputSchema>;
export type BusinessHoursInputParsed = z.infer<typeof businessHoursInputSchema>;
export type BusinessDeliveryZoneInputParsed = z.infer<typeof businessDeliveryZoneInputSchema>;
export type BusinessProfileInputParsed = z.infer<typeof businessProfileInputSchema>;
