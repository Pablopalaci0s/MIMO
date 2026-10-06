import { prisma } from "@mimo/database";
import { ForbiddenError, UnauthorizedError, auth } from "@mimo/auth";
import { isManager, type StaffActor, type StaffRole } from "@/lib/support/ticket-rules";

/**
 * Autorización del centro de soporte. Punto de entrada único para cada página
 * de `/centro-soporte` y cada ruta de `/api/centro-soporte`.
 *
 * El rol se lee de LA BASE en cada llamada (no del JWT, que solo se actualiza
 * al volver a iniciar sesión): así bajarle el rol a alguien o suspender su
 * cuenta corta su acceso al instante. El proxy (`proxy.ts`) es solo la primera
 * barrera, con el rol del JWT.
 *
 * Quién entra: SUPPORT_AGENT, SUPPORT_MANAGER y ADMIN. Un negocio o un cliente
 * nunca pasa, y que alguien sea de soporte tampoco le da acceso a `/admin`
 * ni a los documentos de identidad (eso exige ADMIN + permiso aparte).
 */

const STAFF_ROLES: StaffRole[] = ["SUPPORT_AGENT", "SUPPORT_MANAGER", "ADMIN"];

/** `null` si no hay sesión, la cuenta no existe/está suspendida o su rol no es de soporte. */
export async function resolveSupportStaff(): Promise<StaffActor | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return null;
  if (!STAFF_ROLES.includes(user.role as StaffRole)) return null;
  return { id: user.id, role: user.role as StaffRole };
}

/**
 * Para rutas de API: lanza 401 sin sesión y 403 si no es personal de soporte
 * (o, con `manager: true`, si no es supervisor/administrador).
 */
export async function requireSupportStaff(options: { manager?: boolean } = {}): Promise<StaffActor> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const actor = await resolveSupportStaff();
  if (!actor) throw new ForbiddenError("No tenés acceso al centro de soporte.");
  if (options.manager && !isManager(actor)) {
    throw new ForbiddenError("Esta sección es solo para supervisores de soporte.");
  }
  return actor;
}
