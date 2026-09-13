import type { Metadata, Viewport } from "next";
import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import { pwaMetadata, pwaViewport } from "@/lib/pwa-metadata";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = pwaViewport;

export const metadata: Metadata = { ...pwaMetadata, title: "Sin conexión — MIMO" };

// Root layout propio (sin Header/Footer/Providers) porque esta página se
// sirve desde el cache del service worker cuando NO hay red — no puede
// depender de nada que necesite llegar al servidor (auth(), fetch de
// sesión, etc.), o el fallback offline se rompería justo cuando más se
// necesita. Ver el gotcha de múltiples root layouts en CLAUDE.md.
// ThemeProvider sí es seguro acá — es 100% cliente (localStorage), sin
// red — así el modo oscuro no se rompe justo cuando se perdió la conexión.
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-SV"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
