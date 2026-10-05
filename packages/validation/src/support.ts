import { z } from "zod";

const conversationId = z.string().uuid();

/** Ruta interna desde la que se escribe (ej. "/checkout") — solo sirve de
 * contexto para el bot, nunca se usa para redirigir ni se renderiza. */
const pagePath = z
  .string()
  .trim()
  .max(200)
  .regex(/^\/[^\s]*$/, "Ruta inválida")
  .optional();

export const supportSendMessageSchema = z.object({
  conversationId: conversationId.optional(),
  message: z.string().trim().min(1, "Escribí un mensaje").max(1000, "Máximo 1000 caracteres"),
  pagePath,
});

export const supportEscalateSchema = z.object({
  conversationId: conversationId.optional(),
  reason: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  guestName: z.string().trim().min(1, "Ingresá tu nombre").max(80).optional(),
  guestEmail: z.string().trim().toLowerCase().email("Correo inválido").max(120).optional(),
});

export const supportConversationRefSchema = z.object({ conversationId });

export const supportRateSchema = z.object({
  conversationId,
  rating: z.coerce.number().int().min(1).max(5),
});

export const supportAdminReplySchema = z.object({
  message: z.string().trim().min(1, "Escribí una respuesta").max(2000, "Máximo 2000 caracteres"),
});

export const supportAdminUpdateSchema = z.object({
  action: z.enum(["resolve", "reopen"]),
});

export type SupportSendMessageInput = z.infer<typeof supportSendMessageSchema>;
export type SupportEscalateInput = z.infer<typeof supportEscalateSchema>;

export const supportRequestSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  message: z.string().trim().min(10, "Contanos un poco más").max(2000),
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
