import { NextResponse } from "next/server";
import { auth } from "@mimo/auth";

const BUSINESS_PREFIX = "/negocio";
const ADMIN_PREFIX = "/admin";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const role = request.auth?.user?.role;

  if (pathname.startsWith(ADMIN_PREFIX) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
  }

  if (pathname.startsWith(BUSINESS_PREFIX) && role !== "BUSINESS" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/negocio/:path*", "/admin/:path*"],
};
