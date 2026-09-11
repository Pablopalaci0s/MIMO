import type { Metadata, Viewport } from "next";
import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { pwaMetadata, pwaViewport } from "@/lib/pwa-metadata";
import { Providers } from "../providers";

export const viewport: Viewport = pwaViewport;

export const metadata: Metadata = {
  ...pwaMetadata,
  title: "MIMO — Regalos para hacerle el día a alguien",
  description:
    "Decime qué querés transmitir y nosotros encontramos el detalle. MIMO es el marketplace salvadoreño de flores, regalos y experiencias.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-SV"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
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
