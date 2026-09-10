import type { Metadata } from "next";
import "../globals.css";
import { geistSans, geistMono } from "@/lib/fonts";
import { Providers } from "../providers";

export const metadata: Metadata = { title: "MIMO" };

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-SV" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full min-w-0 overflow-x-hidden bg-neutral-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
