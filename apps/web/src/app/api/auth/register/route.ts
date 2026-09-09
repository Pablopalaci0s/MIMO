import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@mimo/database";
import { registerSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
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

    return apiSuccess(user, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
