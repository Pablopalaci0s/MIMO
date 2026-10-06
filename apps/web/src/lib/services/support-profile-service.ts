import { Prisma, prisma } from "@mimo/database";
import { suggestSupportUsername, supportUsernameSchema } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import type { StaffActor } from "@/lib/support/ticket-rules";
import { logAdminAction } from "./admin-audit-service";

/**
 * Perfil del personal de soporte: su nombre de usuario.
 *
 * Es lo que ve el cliente en el chat (en vez del nombre real) y lo que ve el
 * equipo en la barra lateral. Se elige UNA sola vez, la primera vez que la
 * persona entra al centro de soporte; después queda fijo. La regla "una sola
 * vez" la garantiza la base (`updateMany` condicionado a que todavía no haya
 * uno), no la pantalla: dos pestañas o dos requests a la vez no pueden pisarse.
 */

export interface SupportProfileDTO {
  name: string;
  /** null hasta que la persona lo elija. */
  username: string | null;
  setAt: string | null;
  /** Ya lo eligió: no se puede cambiar. */
  locked: boolean;
  /** Propuesta para el formulario de la primera vez. */
  suggested: string;
  /** Los administradores no necesitan nombre de usuario: no se les pide. */
  required: boolean;
}

export async function getSupportProfile(actor: StaffActor): Promise<SupportProfileDTO> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, supportUsername: true, supportUsernameSetAt: true },
  });
  if (!user) throw new AppError("NOT_FOUND", "No encontramos tu cuenta.", 404);

  return {
    name: user.name ?? "",
    username: user.supportUsername,
    setAt: user.supportUsernameSetAt?.toISOString() ?? null,
    locked: user.supportUsername !== null,
    suggested: suggestSupportUsername(user.name),
    required: actor.role !== "ADMIN",
  };
}

/** Elige el nombre de usuario (solo si todavía no tiene uno). */
export async function setSupportUsername(actor: StaffActor, rawUsername: string): Promise<SupportProfileDTO> {
  const parsed = supportUsernameSchema.safeParse(rawUsername);
  if (!parsed.success) {
    throw new AppError("INVALID_USERNAME", parsed.error.issues[0]?.message ?? "Nombre de usuario inválido.", 400);
  }
  const username = parsed.data;

  // Aviso amable antes de escribir (la garantía real es el índice único de la base).
  const taken = await prisma.user.findFirst({ where: { supportUsername: username }, select: { id: true } });
  if (taken) throw new AppError("USERNAME_TAKEN", "Ese nombre de usuario ya lo usa otra persona. Probá con otro.", 409);

  let updated: { count: number };
  try {
    updated = await prisma.user.updateMany({
      where: { id: actor.id, supportUsername: null },
      data: { supportUsername: username, supportUsernameSetAt: new Date() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("USERNAME_TAKEN", "Ese nombre de usuario ya lo usa otra persona. Probá con otro.", 409);
    }
    throw error;
  }
  if (updated.count === 0) {
    throw new AppError("USERNAME_ALREADY_SET", "Tu nombre de usuario ya está elegido y no se puede cambiar. Si necesitás cambiarlo, pedíselo a un administrador.", 409);
  }

  await logAdminAction({ adminId: actor.id, action: "support.username_set", targetType: "USER", targetId: actor.id, metadata: { username } });
  return getSupportProfile(actor);
}
