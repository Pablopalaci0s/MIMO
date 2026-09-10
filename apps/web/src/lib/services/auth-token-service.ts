import { createHash, randomBytes } from "node:crypto";
import { prisma, type AuthTokenPurpose } from "@mimo/database";

const TOKEN_BYTES = 32;
const TTL_BY_PURPOSE: Record<AuthTokenPurpose, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hora — corto porque da acceso a la cuenta
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 horas — solo confirma el correo
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Devuelve el token en texto plano (para mandarlo por correo) — nunca se
 * guarda así, solo su hash. */
export async function createAuthToken(userId: string, purpose: AuthTokenPurpose): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_BY_PURPOSE[purpose]),
    },
  });
  return token;
}

/** Un solo uso: si el token es válido lo marca usado en la misma consulta
 * y devuelve el userId; si ya se usó, venció, o no existe, devuelve null
 * sin dar pistas de cuál fue el motivo (no hay nada que un atacante deba
 * poder distinguir acá). */
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose): Promise<string | null> {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}
