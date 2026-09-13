"use client";

import { Gift, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GiftRegistryDTO, GiftRegistryInput } from "@mimo/types";

export function GiftRegistryList({ registries }: { registries: GiftRegistryDTO[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/perfil/listas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        eventType: eventType || undefined,
        eventDate: eventDate || undefined,
        isActive: true,
      } satisfies GiftRegistryInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear la lista."));
      return;
    }
    router.push(`/perfil/listas/${body.data.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {registries.map((registry) => (
        <Link
          key={registry.id}
          href={`/perfil/listas/${registry.id}`}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300"
        >
          <div>
            <p className="font-medium text-neutral-900">{registry.title}</p>
            <p className="text-sm text-neutral-500">
              {registry.itemCount} {registry.itemCount === 1 ? "regalo" : "regalos"} · {registry.reservedCount}{" "}
              reservado{registry.reservedCount === 1 ? "" : "s"}
              {!registry.isActive && " · Oculta"}
            </p>
          </div>
        </Link>
      ))}

      {creating ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registry-title">Título</Label>
            <Input
              id="registry-title"
              required
              placeholder="Ej. Nuestra boda, Baby shower de Sofía..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registry-type">Tipo de evento (opcional)</Label>
              <Input
                id="registry-type"
                placeholder="Boda, cumpleaños..."
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registry-date">Fecha del evento (opcional)</Label>
              <Input id="registry-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear lista"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)} className="w-fit">
          <Plus className="size-4" /> Crear lista de regalos
        </Button>
      )}

      {registries.length === 0 && !creating && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
          <Gift className="size-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">
            Armá una lista para tu boda, baby shower o cumpleaños y compartí el link — así nadie te repite el
            regalo.
          </p>
        </div>
      )}
    </div>
  );
}
