import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@mimo/database";
import { registerSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { requestEmailVerification } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "register", 5, 15 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return apiError("EMAIL_TAKEN", "Ya existe una cuenta con ese correo", 409);
    }

    const passwordHash = await hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "USER",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    await requestEmailVerification(user.id);

    return apiSuccess(user, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
