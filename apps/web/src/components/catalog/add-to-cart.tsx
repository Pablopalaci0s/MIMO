"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart/cart-context";
import type { ProductDTO } from "@mimo/types";

export function AddToCart({ product }: { product: ProductDTO }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [dedication, setDedication] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        businessId: product.business.id,
        businessName: product.business.name,
        unitPrice: product.price,
        imageUrl: product.coverImageUrl,
        personalization: product.isPersonalizable
          ? { dedication: dedication || undefined, message: recipientName ? `Para: ${recipientName}` : undefined }
          : undefined,
      },
      quantity,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
      {product.isPersonalizable && (
        <>
          <p className="text-sm font-semibold text-neutral-900">Personalizá tu regalo</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipient-name">Nombre del destinatario (opcional)</Label>
            <Input
              id="recipient-name"
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              placeholder="Ej. María"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dedication">Mensaje de dedicatoria (opcional)</Label>
            <Textarea
              id="dedication"
              value={dedication}
              onChange={(event) => setDedication(event.target.value)}
              placeholder="Escribí lo que querés decirle..."
              rows={3}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-700">Cantidad</span>
        <div className="flex items-center gap-3 rounded-full border border-neutral-200 px-1 py-1">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-7 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
            aria-label="Reducir cantidad"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-4 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="flex size-7 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <Button onClick={handleAdd} className="h-11 w-full">
        {justAdded ? "Agregado ✓" : "Agregar al carrito"}
      </Button>
    </div>
  );
}
