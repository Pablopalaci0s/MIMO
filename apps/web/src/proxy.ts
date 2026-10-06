import { NextResponse } from "next/server";
import { auth } from "@mimo/auth";
import { canAccessRoute } from "@/lib/route-access";

// El personal de soporte tiene su propia área (/centro-soporte), separada de
// /admin a propósito: ver `lib/route-access.ts`. Esto es solo la primera
// barrera, con el rol del JWT; cada página y cada ruta de /api/centro-soporte
// vuelven a verificar contra la base.
export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (!canAccessRoute(pathname, request.auth?.user?.role)) {
    return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/negocio/:path*", "/admin/:path*", "/centro-soporte/:path*"],
};
