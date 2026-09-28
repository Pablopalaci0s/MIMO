import { z } from "zod";

export const supportRequestSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  message: z.string().trim().min(10, "Contanos un poco más").max(2000),
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
