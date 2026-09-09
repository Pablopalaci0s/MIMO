import { auth } from "@mimo/auth";
import { prisma } from "@mimo/database";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "No autenticado", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true, image: true, role: true, createdAt: true },
    });
    if (!user) {
      return apiError("NOT_FOUND", "Usuario no encontrado", 404);
    }

    return apiSuccess(user);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
