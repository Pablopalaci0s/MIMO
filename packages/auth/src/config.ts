import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@mimo/database";
import { loginSchema } from "@mimo/validation";

/**
 * Shared Auth.js config. Lives outside apps/web so the same authorization
 * rules and session shape can be reused by other surfaces later (e.g. a
 * tRPC/route-handler layer consumed by the future Expo app) without
 * duplicating logic — see packages/auth/src/index.ts for the Next.js glue.
 *
 * Session strategy is JWT: Credentials sign-in can't use database sessions,
 * and this keeps the door open for Google/Apple OAuth (section 5) to link
 * into the same PrismaAdapter without a strategy change.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/iniciar-sesion",
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.passwordHash || user.deletedAt) return null;

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "BUSINESS" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
  trustHost: true,
};
