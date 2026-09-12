"use client";

import { Loader2, Plus, PartyPopper, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupGiftDTO, GroupGiftInput, ProductSummaryDTO } from "@mimo/types";

export function GroupGiftList({ gifts }: { gifts: GroupGiftDTO[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummaryDTO[] | null>(null);
  const [product, setProduct] = useState<ProductSummaryDTO | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      const response = await fetch(`/api/products?q=${encodeURIComponent(query.trim())}&pageSize=6`);
      const body = await response.json();
      if (!cancelled && body.success) setResults(body.data.items);
    }

    const timeout = setTimeout(() => void search(), 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function pickProduct(p: ProductSummaryDTO) {
    setProduct(p);
    setTargetAmount(String(p.price));
    setQuery("");
    setResults(null);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setLoading(true);
    setError(null);

    const response = await fetch("/api/perfil/cabudas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        title,
        message: message || undefined,
        targetAmount: Number(targetAmount),
        deadline: deadline || undefined,
        organizerPaypalEmail: paypalEmail,
      } satisfies GroupGiftInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear la cabuda."));
      return;
    }
    router.push(`/perfil/cabudas/${body.data.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {gifts.map((gift) => (
        <Link
          key={gift.id}
          href={`/perfil/cabudas/${gift.id}`}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300"
        >
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {gift.productImageUrl && <Image src={gift.productImageUrl} alt="" fill className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-neutral-900">{gift.title}</p>
            <p className="text-sm text-neutral-500">
              ${gift.collectedAmount.toFixed(2)} de ${gift.targetAmount.toFixed(2)}
              {gift.status !== "OPEN" && ` · ${gift.status === "COMPLETED" ? "Completada" : "Cancelada"}`}
            </p>
          </div>
        </Link>
      ))}

      {creating ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4">
          {!product ? (
            <div className="flex flex-col gap-1.5">
              <Label>Elegí el producto a regalar</Label>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  placeholder="Buscar un producto de MIMO..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {results && results.length > 0 && (
                <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-1.5">
                  {results.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => pickProduct(p)}
                      className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-neutral-50"
                    >
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {p.coverImageUrl && <Image src={p.coverImageUrl} alt="" fill className="object-cover" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <span className="text-xs text-neutral-500">${p.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2 text-sm">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {product.coverImageUrl && <Image src={product.coverImageUrl} alt="" fill className="object-cover" />}
              </div>
              <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
              <button type="button" onClick={() => setProduct(null)} className="text-xs text-neutral-500 underline">
                Cambiar
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gift-title">Título de la cabuda</Label>
            <Input
              id="gift-title"
              required
              placeholder="Ej. Regalo de cumpleaños para Ana"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gift-message">Mensaje (opcional)</Label>
            <Textarea
              id="gift-message"
              rows={2}
              placeholder="Contales a los que aportan de qué se trata"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gift-target">Meta (USD)</Label>
              <Input
                id="gift-target"
                required
                type="number"
                min="1"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gift-deadline">Fecha límite (opcional)</Label>
              <Input id="gift-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gift-paypal">Tu correo de PayPal</Label>
            <Input
              id="gift-paypal"
              required
              type="email"
              placeholder="Ahí te mandamos lo recaudado cuando cierres la cabuda"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !product}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear cabuda"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)} className="w-fit">
          <Plus className="size-4" /> Crear cabuda
        </Button>
      )}

      {gifts.length === 0 && !creating && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
          <PartyPopper className="size-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">
            Armá una cabuda para juntar entre varios y regalar algo más grande — compartí el link y cada quien
            aporta lo que quiera.
          </p>
        </div>
      )}
    </div>
  );
}
