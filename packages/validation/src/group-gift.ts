import { z } from "zod";

export const groupGiftInputSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  message: z.string().trim().max(500).optional(),
  targetAmount: z.coerce.number().positive("Tiene que ser mayor a 0").max(10000),
  deadline: z.string().trim().optional(),
  organizerPaypalEmail: z.string().trim().toLowerCase().email("Correo de PayPal inválido"),
});

export type GroupGiftInputParsed = z.infer<typeof groupGiftInputSchema>;

export const contributeToGroupGiftSchema = z.object({
  contributorName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
  amount: z.coerce.number().positive("Tiene que ser mayor a 0").max(10000),
});

export type ContributeToGroupGiftParsed = z.infer<typeof contributeToGroupGiftSchema>;
