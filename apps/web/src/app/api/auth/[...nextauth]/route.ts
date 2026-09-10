import { NextRequest } from "next/server";
import { handlers } from "@mimo/auth";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export const { GET } = handlers;

// Solo el intento de login (credentials callback) se limita acá — el resto
// de las acciones de Auth.js bajo esta misma ruta catch-all (session, csrf,
// signout) se llaman constantemente en cada carga de página y no deberían
// compartir balde con un ataque de fuerza bruta.
export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/callback/credentials") {
    const limited = rateLimitResponse(request, "login", 10, 15 * 60 * 1000);
    if (limited) return limited;
  }
  return handlers.POST(request);
}
