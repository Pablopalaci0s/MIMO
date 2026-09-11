import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { prisma } from "@mimo/database";
import { loginSchema } from "@mimo/validation";
import { oauthProviderStatus } from "./oauth";

/**
 * Shared Auth.js config. Lives outside apps/web so the same authorization
 * rules and session shape can be reused by other surfaces later (e.g. a
 * tRPC/route-handler layer consumed by the future Expo app) without
 * duplicating logic — see packages/auth/src/index.ts for the Next.js glue.
 *
 * Session strategy is JWT: Credentials sign-in can't use database sessions,
 * y esto permite que Google/Facebook (ver oauthProviderStatus) se linkeen
 * al mismo PrismaAdapter sin cambiar de estrategia.
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
    ...(oauthProviderStatus.google
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Google ya verificó el correo — permitir que se vincule a una
            // cuenta existente creada con contraseña en vez de fallar con
            // "OAuthAccountNotLinked" cuando alguien usa el mismo correo.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(oauthProviderStatus.facebook
      ? [
          Facebook({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // El login por contraseña ya rechaza cuentas suspendidas en
      // authorize(). Este callback cubre el flujo OAuth, que nunca pasa por
      // authorize() — sin esto, suspender a alguien no le impediría volver
      // a entrar con Google/Facebook.
      if (account?.provider !== "credentials") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email as string },
          select: { deletedAt: true },
        });
        if (existing?.deletedAt) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        return token;
      }

      // El login ya rechaza cuentas suspendidas (deletedAt) en authorize(),
      // pero la sesión es JWT: sin esto, una cuenta suspendida DESPUÉS de
      // iniciar sesión seguiría con acceso normal hasta que el token expire.
      // auth() llama a este callback en cada request (ver getSession en
      // next-auth/lib/index.js), así que esto cierra esa sesión al vuelo.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { deletedAt: true },
        });
        if (!dbUser || dbUser.deletedAt) return null;
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
