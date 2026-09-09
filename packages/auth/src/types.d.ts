import type { DefaultSession } from "next-auth";

type MimoRole = "USER" | "BUSINESS" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: MimoRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: MimoRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: MimoRole;
  }
}
