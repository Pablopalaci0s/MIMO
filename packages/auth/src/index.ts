/// <reference path="./types.d.ts" />
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
export { assertRole, ForbiddenError, UnauthorizedError } from "./roles";
export type { MimoRole } from "./roles";
