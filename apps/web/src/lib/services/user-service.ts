import { compare, hash } from "bcryptjs";
import { prisma } from "@mimo/database";
import type { PasswordChangeInput, UserUpdateInput } from "@mimo/validation";
import type { UserDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";

function toUserDTO(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: UserDTO["role"];
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
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
