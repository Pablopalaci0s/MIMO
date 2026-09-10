import { z } from "zod";

export const importantDateInputSchema = z.object({
  type: z.enum(["ANNIVERSARY", "BIRTHDAY", "MOTHERS_DAY", "FATHERS_DAY", "GRADUATION", "OTHER"]),
  label: z.string().trim().min(2, "Ponele un nombre a la fecha").max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  recipientName: z.string().trim().max(80).optional().or(z.literal("")),
  remindDaysBefore: z.coerce.number().int().min(0).max(60).optional(),
});

export type ImportantDateInputParsed = z.infer<typeof importantDateInputSchema>;
