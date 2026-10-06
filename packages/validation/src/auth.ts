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
  businessName: z.string().trim().min(2, "El nombre del negocio es muy corto").max(120, "El nombre del negocio es muy largo"),
  ownerName: z.string().trim().min(2, "Tu nombre es muy corto").max(100, "Tu nombre es muy largo"),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().regex(/^[267]\d{7}$/, "Teléfono salvadoreño inválido (8 dígitos)"),
  municipalityId: z.string().uuid("Selecciona un municipio válido"),
  addressLine: z.string().trim().min(5, "La dirección es muy corta").max(255, "La dirección es muy larga"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "La contraseña debe incluir al menos un número"),
  // Versión del Acuerdo MIMO ↔ negocio que la persona leyó y aceptó (la
  // casilla del formulario). El servidor la compara con la vigente.
  acceptedAgreementVersion: z.string().trim().min(1, "Tenés que aceptar el acuerdo para negocios"),
  // Política de privacidad (incluye el uso del DUI): aceptación explícita.
  acceptedPrivacyVersion: z.string().trim().min(1, "Tenés que aceptar la Política de privacidad"),
});
export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

export const businessAgreementAcceptSchema = z.object({
  version: z.string().trim().min(1, "Falta la versión del acuerdo"),
});
export type BusinessAgreementAcceptInput = z.infer<typeof businessAgreementAcceptSchema>;

export const businessPrivacyAcceptSchema = z.object({
  version: z.string().trim().min(1, "Falta la versión de la política"),
});
export type BusinessPrivacyAcceptInput = z.infer<typeof businessPrivacyAcceptSchema>;

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
