"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/cart-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";
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
        </FavoritesProvider>
      </CartProvider>
    </SessionProvider>
  );
}
