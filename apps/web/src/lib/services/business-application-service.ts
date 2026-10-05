import { hash } from "bcryptjs";
import { prisma } from "@mimo/database";
import type { RegisterBusinessInput } from "@mimo/validation";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import { assertCurrentAgreementVersion } from "./business-agreement-service";

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
 * Registrarse implica aceptar el Acuerdo MIMO ↔ negocio (`/terminos-negocios`):
 * la aceptación queda guardada con su versión y fecha.
 */
export async function applyAsBusiness(input: RegisterBusinessInput): Promise<{ userId: string }> {
  // Antes de tocar la base: no se crea ninguna cuenta si la persona aceptó
  // una versión del acuerdo que ya no es la vigente.
  assertCurrentAgreementVersion(input.acceptedAgreementVersion);

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

    // La constancia de aceptación nace en la misma transacción que la
    // cuenta: no puede existir un negocio registrado sin ella.
    await tx.businessAgreementAcceptance.create({
      data: { businessId: business.id, acceptedById: user.id, version: input.acceptedAgreementVersion },
    });

    return { userId: user.id };
  });

  return result;
}
