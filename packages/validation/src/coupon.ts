import { z } from "zod";
import { cartItemInputSchema } from "./order";

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Ingresá un código").max(40),
  items: z.array(cartItemInputSchema).min(1),
});

export type ApplyCouponParsed = z.infer<typeof applyCouponSchema>;

export const adminCouponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mínimo 3 caracteres")
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones"),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().positive("Tiene que ser mayor a 0"),
    minSubtotal: z.coerce.number().min(0).optional().nullable(),
    maxUses: z.coerce.number().int().positive().optional().nullable(),
    maxUsesPerUser: z.coerce.number().int().positive().optional().nullable(),
    startsAt: z.string().trim().optional().nullable(),
    expiresAt: z.string().trim().optional().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Un % no puede ser mayor a 100",
      });
    }
  });

export type AdminCouponInputParsed = z.infer<typeof adminCouponInputSchema>;
