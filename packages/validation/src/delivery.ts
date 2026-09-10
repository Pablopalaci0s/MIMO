import { z } from "zod";

export const deliveryCoverageCheckSchema = z.object({
  businessIds: z.array(z.string().uuid()).min(1),
  municipalityId: z.string().uuid(),
});

export const coverageRequestInputSchema = z.object({
  businessId: z.string().uuid(),
  municipalityId: z.string().uuid(),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  contactEmail: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
});

export const coverageRequestStatusUpdateSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
});

export type DeliveryCoverageCheckParsed = z.infer<typeof deliveryCoverageCheckSchema>;
export type CoverageRequestInputParsed = z.infer<typeof coverageRequestInputSchema>;
