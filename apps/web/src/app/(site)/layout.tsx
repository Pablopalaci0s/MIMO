import type { Metadata, Viewport } from "next";
import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { pwaMetadata, pwaViewport } from "@/lib/pwa-metadata";
import { Providers } from "../providers";

export const viewport: Viewport = pwaViewport;

const DESCRIPTION =
  "Decime qué querés transmitir y nosotros encontramos el detalle. MIMO es el marketplace salvadoreño de flores, regalos y experiencias.";

export const metadata: Metadata = {
  ...pwaMetadata,
  // Necesario para que las URLs relativas de `openGraph.images` (acá y en
  // cada página que extiende esta metadata, ej. producto/negocio) se
  // resuelvan a una URL absoluta real — sin esto, Facebook/WhatsApp/Twitter
  // no pueden buscar la imagen al armar la vista previa de un link.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "MIMO — Regalos para hacerle el día a alguien",
    template: "%s — MIMO",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_SV",
    siteName: "MIMO",
    title: "MIMO — Regalos para hacerle el día a alguien",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "MIMO — Regalos para hacerle el día a alguien",
    description: DESCRIPTION,
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-SV" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        <Providers>
          <Header />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
