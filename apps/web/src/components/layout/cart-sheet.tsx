"use client";

import { Gift, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/cart-context";

export function CartSheet({ variant = "icon" }: { variant?: "icon" | "tab" }) {
  const { items, count, subtotal, updateQuantity, removeItem, isHydrated } = useCart();
  const [open, setOpen] = useState(false);

  const groupedByBusiness = items.reduce<Record<string, typeof items>>((groups, item) => {
    (groups[item.businessName] ??= []).push(item);
    return groups;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "tab" ? (
          <button
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-neutral-400 aria-expanded:text-neutral-900"
            aria-label="Ver carrito"
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            Carrito
            {isHydrated && count > 0 && (
              <span className="absolute top-1 right-[calc(50%-18px)] flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        ) : (
          <button
            className="relative flex size-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
            aria-label="Ver carrito"
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {isHydrated && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tu carrito</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <ShoppingBag className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">Todavía no agregaste nada.</p>
              <p className="mt-0.5 text-sm text-neutral-500">Los productos que elijas van a aparecer acá.</p>
            </div>
            <Button variant="outline" className="mt-1 rounded-full" onClick={() => setOpen(false)} asChild>
              <Link href="/regalos">Explorar catálogo</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {Object.entries(groupedByBusiness).map(([businessName, businessItems]) => (
                <div key={businessName} className="mb-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-neutral-400 uppercase">
                    <Store className="size-3.5" />
                    {businessName}
                  </p>
                  <div className="flex flex-col gap-3">
                    {businessItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex gap-3 rounded-2xl border border-neutral-200 p-3"
                      >
                        <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              sizes="72px"
                              className="object-cover"
                            />
                          ) : (
                            <MediaPlaceholder icon={Gift} iconClassName="size-5" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-medium text-neutral-900">
                              {item.productName}
                            </p>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                              aria-label="Quitar del carrito"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-neutral-500">${item.unitPrice.toFixed(2)} c/u</p>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 rounded-full border border-neutral-200 px-1">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="flex size-6 items-center justify-center rounded-full hover:bg-neutral-100"
                                aria-label="Reducir cantidad"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="flex size-6 items-center justify-center rounded-full hover:bg-neutral-100"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                            <span className="text-sm font-semibold text-neutral-900">
                              ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 px-4 py-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  Subtotal ({count} {count === 1 ? "producto" : "productos"})
                </span>
                <span className="font-semibold text-neutral-900">${subtotal.toFixed(2)}</span>
              </div>
              <p className="mb-3 text-xs text-neutral-400">El envío se calcula en el checkout.</p>
              <Button asChild className="h-11 w-full" onClick={() => setOpen(false)}>
                <Link href="/checkout">Ir a pagar</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
