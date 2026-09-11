"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/cart-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";
import { CookieAiNotice } from "@/components/layout/cookie-ai-notice";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <FavoritesProvider>
          {children}
          <ServiceWorkerRegister />
          <InstallPrompt />
          <CookieAiNotice />
        </FavoritesProvider>
      </CartProvider>
    </SessionProvider>
  );
}
