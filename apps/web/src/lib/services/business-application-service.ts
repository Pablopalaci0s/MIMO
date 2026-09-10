import { hash } from "bcryptjs";
import { prisma } from "@mimo/database";
import type { RegisterBusinessInput } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

async function uniqueBusinessSlug(name: string): Promise<string> {
  const base = slugify(name) || "negocio";
  let candidate = base;
  let suffix = 1;
  while (await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/**
 * Alta de negocio: crea la cuenta (rol BUSINESS) y el negocio en estado
 * PENDING en una sola operación — el negocio no aparece públicamente
 * (business-service filtra `status: "APPROVED"`) hasta que un admin lo
 * apruebe desde /admin/negocios (Fase 6). El dueño sí puede entrar a
 * /negocio de inmediato y ve el aviso de "pendiente de aprobación".
 */
export async function applyAsBusiness(input: RegisterBusinessInput): Promise<{ userId: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("EMAIL_TAKEN", "Ya existe una cuenta con ese correo", 409);
  }

  const passwordHash = await hash(input.password, 10);
  const slug = await uniqueBusinessSlug(input.businessName);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.ownerName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "BUSINESS",
      },
    });

    const business = await tx.business.create({
      data: {
        name: input.businessName,
        slug,
        whatsapp: input.whatsapp || input.phone,
        municipalityId: input.municipalityId,
        addressLine: input.addressLine,
        status: "PENDING",
      },
    });

    await tx.businessUser.create({
      data: { businessId: business.id, userId: user.id, role: "OWNER" },
    });

    return { userId: user.id };
  });

  return result;
}
