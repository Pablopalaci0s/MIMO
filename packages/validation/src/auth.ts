import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z
    .string()
    .trim()
    .regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido (8 dígitos)")
    .optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido"),
  whatsapp: z.string().trim().optional(),
  municipalityId: z.string().uuid("Selecciona un municipio válido"),
  addressLine: z.string().trim().min(5).max(255),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});
export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido (8 dígitos)")
    .optional()
    .or(z.literal("")),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número"),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
