import { z } from "zod";

export const giftRegistryInputSchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  eventType: z.string().trim().max(50).optional().or(z.literal("")),
  eventDate: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type GiftRegistryInputParsed = z.infer<typeof giftRegistryInputSchema>;

export const addGiftRegistryItemSchema = z.object({
  productId: z.string().uuid(),
  note: z.string().trim().max(200).optional(),
});

export const reserveGiftSchema = z.object({
  reservedByName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
});
