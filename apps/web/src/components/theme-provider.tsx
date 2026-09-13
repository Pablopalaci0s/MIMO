"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Wrapper fino sobre next-themes: alterna la clase `dark` en <html> y
 * persiste la preferencia en localStorage, con el script anti-flash que
 * next-themes inyecta automáticamente (evita el parpadeo de tema al
 * cargar). Claro por defecto — es opt-in, no sigue la preferencia del
 * sistema operativo salvo que el usuario lo elija a mano en /perfil.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemeProvider>
  );
}
