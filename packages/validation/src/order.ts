import { z } from "zod";

const salvadoranPhone = z
  .string()
  .trim()
  .regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido (8 dígitos)");

export const personalizationSchema = z.object({
  message: z.string().trim().max(300).optional(),
  dedication: z.string().trim().max(500).optional(),
  color: z.string().trim().max(60).optional(),
  size: z.string().trim().max(60).optional(),
  cardText: z.string().trim().max(300).optional(),
});

export const cartItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  personalization: personalizationSchema.optional(),
});

export const checkoutAddressSchema = z.object({
  recipientName: z.string().trim().min(2).max(100),
  recipientPhone: salvadoranPhone,
  addressLine: z.string().trim().min(5).max(255),
  reference: z.string().trim().max(255).optional(),
  municipalityId: z.string().uuid("Selecciona un municipio válido"),
  deliveryDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha de entrega inválida"),
  deliveryWindow: z.enum(["ASAP", "MORNING", "MIDDAY", "AFTERNOON", "EVENING"]),
  deliveryInstructions: z.string().trim().max(300).optional(),
});

export const checkoutInputSchema = z.object({
  buyerName: z.string().trim().min(2).max(100),
  buyerEmail: z.string().trim().toLowerCase().email(),
  buyerPhone: salvadoranPhone,
  items: z.array(cartItemInputSchema).min(1, "El carrito está vacío"),
  address: checkoutAddressSchema,
  isSurpriseMode: z.boolean(),
  hideBuyerFromRecipient: z.boolean(),
  surpriseInstructions: z.string().trim().max(300).optional(),
  // Solo CASH está activo esta fase — ver README, sección "Diseño: pagos y
  // seguimiento de pedidos". CARD/PAYPAL se validan igual para no romper el
  // tipo compartido con la futura app móvil, pero el servicio los rechaza.
  paymentProvider: z.enum(["CARD", "PAYPAL", "CASH", "OTHER"]),
});

export type CheckoutInputParsed = z.infer<typeof checkoutInputSchema>;
