import { z } from "zod";
import { imageUrlSchema } from "./business";

export const adminBusinessUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
  verified: z.boolean().optional(),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["USER", "BUSINESS", "ADMIN"]).optional(),
  isSuspended: z.boolean().optional(),
});

export const adminCategoryInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  emoji: z.string().trim().max(8).optional(),
  parentId: z.string().uuid().optional().nullable(),
  position: z.coerce.number().int().min(0).max(999),
});

export const adminBannerInputSchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  imageUrl: imageUrlSchema,
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((value) => !value || value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "Tiene que ser una ruta interna (/regalos) o una URL completa (https://...)",
    }),
  isActive: z.boolean(),
  position: z.coerce.number().int().min(0).max(999),
});

export const adminReportStatusUpdateSchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"]),
});

export const adminReviewStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});
