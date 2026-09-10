import { compare, hash } from "bcryptjs";
import { prisma } from "@mimo/database";
import type { PasswordChangeInput, UserUpdateInput } from "@mimo/validation";
import type { UserDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { consumeAuthToken, createAuthToken } from "./auth-token-service";
import { buildPasswordResetEmail, buildVerifyEmailEmail, sendEmail } from "./email-service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function toUserDTO(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  phone: string | null;
  image: string | null;
  role: UserDTO["role"];
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified !== null,
    phone: user.phone,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateUserProfile(userId: string, input: UserUpdateInput): Promise<UserDTO> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone || null },
  });
  return toUserDTO(user);
}

export async function changeUserPassword(userId: string, input: PasswordChangeInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new AppError("NO_PASSWORD", "Esta cuenta no tiene contraseña configurada.", 400);
  }

  const matches = await compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError("INVALID_PASSWORD", "La contraseña actual no es correcta.", 400);
  }

  const passwordHash = await hash(input.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/**
 * Nunca revela si el correo existe o no en la respuesta — solo manda el
 * correo si hay una cuenta real detrás. Quien llama a esto siempre debe
 * mostrar el mismo mensaje ("si el correo existe, te llegó un link") sin
 * importar el resultado, o se vuelve una forma de enumerar cuentas.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.deletedAt) return;

  const token = await createAuthToken(user.id, "PASSWORD_RESET");
  const resetUrl = `${APP_URL}/restablecer-contrasena?token=${token}`;
  const { subject, html } = buildPasswordResetEmail(resetUrl);
  await sendEmail({ to: user.email, subject, html });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await consumeAuthToken(token, "PASSWORD_RESET");
  if (!userId) {
    throw new AppError("INVALID_TOKEN", "Este link para restablecer tu contraseña venció o ya se usó.", 400);
  }
  const passwordHash = await hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return;

  const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");
  const verifyUrl = `${APP_URL}/verificar-correo?token=${token}`;
  const { subject, html } = buildVerifyEmailEmail(verifyUrl);
  await sendEmail({ to: user.email, subject, html });
}

export async function verifyEmail(token: string): Promise<void> {
  const userId = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (!userId) {
    throw new AppError("INVALID_TOKEN", "Este link de verificación venció o ya se usó.", 400);
  }
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
}
