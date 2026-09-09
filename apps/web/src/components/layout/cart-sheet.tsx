"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/cart-context";

export function CartSheet() {
  const { items, count, subtotal, updateQuantity, removeItem, isHydrated } = useCart();
  const [open, setOpen] = useState(false);

  const groupedByBusiness = items.reduce<Record<string, typeof items>>((groups, item) => {
    (groups[item.businessName] ??= []).push(item);
    return groups;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
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
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tu carrito</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <ShoppingBag className="size-8 text-neutral-300" />
            <p className="text-sm text-neutral-500">Todavía no agregaste nada.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {Object.entries(groupedByBusiness).map(([businessName, businessItems]) => (
                <div key={businessName} className="mb-5">
                  <p className="mb-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">
                    {businessName}
                  </p>
                  <div className="flex flex-col gap-3">
                    {businessItems.map((item) => (
                      <div key={item.productId} className="flex gap-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <p className="line-clamp-1 text-sm font-medium text-neutral-900">
                            {item.productName}
                          </p>
                          <p className="text-sm text-neutral-500">${item.unitPrice.toFixed(2)}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-1">
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
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="flex size-6 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Quitar del carrito"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-semibold text-neutral-900">${subtotal.toFixed(2)}</span>
              </div>
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
