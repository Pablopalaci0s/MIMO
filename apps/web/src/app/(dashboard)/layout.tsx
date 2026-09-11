import type { Metadata, Viewport } from "next";
import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import { pwaMetadata, pwaViewport } from "@/lib/pwa-metadata";
import { Providers } from "../providers";

export const viewport: Viewport = pwaViewport;

export const metadata: Metadata = { ...pwaMetadata, title: "MIMO", robots: { index: false, follow: false } };

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-SV" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full min-w-0 overflow-x-hidden bg-neutral-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
