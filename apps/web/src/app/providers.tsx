"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/cart-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </CartProvider>
    </SessionProvider>
  );
}
