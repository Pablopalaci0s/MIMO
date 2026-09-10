"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FavoriteTargetType } from "@mimo/types";

interface FavoritesContextValue {
  isFavorite: (targetType: FavoriteTargetType, targetId: string) => boolean;
  toggle: (targetType: FavoriteTargetType, targetId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * A diferencia del carrito, los favoritos viven en el servidor (requieren
 * usuario logueado) — así que este provider solo cachea, en memoria del
 * cliente, los ids favoritos de la sesión actual para que cada
 * `FavoriteButton` no tenga que pedir su propio estado (evita N+1 en listas
 * de productos del catálogo/home).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [businessIds, setBusinessIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (status !== "authenticated") {
        setProductIds(new Set());
        setBusinessIds(new Set());
        setLoading(false);
        return;
      }
      const response = await fetch("/api/favoritos/ids");
      const body = await response.json();
      if (cancelled) return;
      if (body.success) {
        setProductIds(new Set(body.data.productIds));
        setBusinessIds(new Set(body.data.businessIds));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const isFavorite = useCallback(
    (targetType: FavoriteTargetType, targetId: string) =>
      targetType === "PRODUCT" ? productIds.has(targetId) : businessIds.has(targetId),
    [productIds, businessIds],
  );

  const toggle = useCallback(async (targetType: FavoriteTargetType, targetId: string) => {
    const setIds = targetType === "PRODUCT" ? setProductIds : setBusinessIds;
    setIds((current) => {
      const next = new Set(current);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    const response = await fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    });
    const body = await response.json();
    if (!body.success) {
      // Revertir si falló (ej. sesión venció entre el click y la respuesta).
      setIds((current) => {
        const next = new Set(current);
        if (next.has(targetId)) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
    }
  }, []);

  const value = useMemo(() => ({ isFavorite, toggle, loading }), [isFavorite, toggle, loading]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return context;
}
