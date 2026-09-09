"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem } from "@mimo/types";

const STORAGE_KEY = "mimo-cart";

/**
 * Estado del carrito vive fuera de React (localStorage + una copia en
 * memoria) y se sincroniza con `useSyncExternalStore` — evita el problema
 * clásico de hidratación (SSR no tiene localStorage) sin llamar a setState
 * dentro de un efecto.
 */
let cachedItems: CartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function readFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena); seguimos en
    // memoria durante la sesión.
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setCart(updater: (current: CartItem[]) => CartItem[]) {
  cachedItems = updater(cachedItems);
  writeToStorage(cachedItems);
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getItemsSnapshot(): CartItem[] {
  return cachedItems;
}

const EMPTY_ITEMS: CartItem[] = [];

function getItemsServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

function getHydratedSnapshot(): boolean {
  return hydrated;
}

function getHydratedServerSnapshot(): boolean {
  return false;
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  cachedItems = readFromStorage();
  notify();
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getItemsSnapshot, getItemsServerSnapshot);
  const isHydrated = useSyncExternalStore(subscribe, getHydratedSnapshot, getHydratedServerSnapshot);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setCart((current) => {
      const existingIndex = current.findIndex((entry) => entry.productId === item.productId);
      if (existingIndex === -1) return [...current, { ...item, quantity }];
      const next = [...current];
      next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + quantity };
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((current) => current.filter((entry) => entry.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) => {
      if (quantity <= 0) return current.filter((entry) => entry.productId !== productId);
      return current.map((entry) => (entry.productId === productId ? { ...entry, quantity } : entry));
    });
  }, []);

  const clear = useCallback(() => setCart(() => []), []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clear, subtotal, count, isHydrated }),
    [items, addItem, removeItem, updateQuantity, clear, subtotal, count, isHydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return context;
}
