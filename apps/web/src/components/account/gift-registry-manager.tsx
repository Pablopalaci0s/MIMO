"use client";

import { Check, Copy, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { GiftRegistryManageDTO, ProductSummaryDTO } from "@mimo/types";

export function GiftRegistryManager({ registry: initial }: { registry: GiftRegistryManageDTO }) {
  const router = useRouter();
  const [registry, setRegistry] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummaryDTO[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/listas/${registry.slug}` : "";

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      const response = await fetch(`/api/products?q=${encodeURIComponent(query.trim())}&pageSize=6`);
      const body = await response.json();
      if (cancelled) return;
      if (body.success) setResults(body.data.items);
      setSearching(false);
    }

    const timeout = setTimeout(() => void search(), 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  async function toggleActive(checked: boolean) {
    setRegistry((prev) => ({ ...prev, isActive: checked }));
    await fetch(`/api/perfil/listas/${registry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: registry.title,
        eventType: registry.eventType ?? undefined,
        eventDate: registry.eventDate ?? undefined,
        message: registry.message ?? undefined,
        isActive: checked,
      }),
    });
    router.refresh();
  }

  async function addProduct(productId: string) {
    setAddingId(productId);
    setError(null);
    const response = await fetch(`/api/perfil/listas/${registry.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const body = await response.json();
    setAddingId(null);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos agregar el producto."));
      return;
    }
    setRegistry(body.data);
    setQuery("");
    setResults(null);
  }

  async function removeItem(itemId: string) {
    setRemovingId(itemId);
    await fetch(`/api/perfil/listas/${registry.id}/items/${itemId}`, { method: "DELETE" });
    setRegistry((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
      itemCount: prev.itemCount - 1,
    }));
    setRemovingId(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4">
        <div className="min-w-0">
          <p className="text-xs text-neutral-400">Link público</p>
          <p className="truncate text-sm font-medium text-neutral-900">{publicUrl}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={copyLink} className="ml-3 shrink-0">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">Lista visible</p>
          <p className="text-xs text-neutral-500">Si la apagás, nadie puede ver la lista ni reservar regalos.</p>
        </div>
        <Switch checked={registry.isActive} onCheckedChange={toggleActive} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Agregar un regalo</h2>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar un producto de MIMO..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {searching && <p className="text-xs text-neutral-400">Buscando...</p>}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-2">
            {results.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-neutral-50">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {product.coverImageUrl && (
                    <Image src={product.coverImageUrl} alt="" fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
                  <p className="text-xs text-neutral-500">${product.price.toFixed(2)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={addingId === product.id}
                  onClick={() => addProduct(product.id)}
                >
                  {addingId === product.id ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
        {results && results.length === 0 && !searching && (
          <p className="text-xs text-neutral-400">No encontramos productos con ese nombre.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">
          Regalos en la lista ({registry.items.length})
        </h2>
        {registry.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-500">
            Todavía no agregaste ningún regalo.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {registry.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {item.productImageUrl && (
                    <Image src={item.productImageUrl} alt="" fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{item.productName}</p>
                  <p className="text-xs text-neutral-500">
                    ${item.price.toFixed(2)}
                    {item.isReserved && (
                      <span className="ml-2 text-emerald-600">
                        · Reservado por {item.reservedByName}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={removingId === item.id}
                  onClick={() => removeItem(item.id)}
                  aria-label="Quitar de la lista"
                  className="text-neutral-400 hover:bg-destructive/10 hover:text-destructive"
                >
                  {removingId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
