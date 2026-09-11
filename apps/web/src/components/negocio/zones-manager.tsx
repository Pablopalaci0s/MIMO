"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { MunicipalityHint } from "@/components/location/municipality-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { BusinessDeliveryZoneDTO, BusinessDeliveryZoneInput, MunicipalityDTO } from "@mimo/types";

function ZoneRow({ zone, municipalities }: { zone: BusinessDeliveryZoneDTO; municipalities: MunicipalityDTO[] }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [municipalityId, setMunicipalityId] = useState(zone.municipalityId ?? "");
  const [deliveryFee, setDeliveryFee] = useState(String(zone.deliveryFee));
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(zone.estimatedMinutes));
  const [isActive, setIsActive] = useState(zone.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(overrides: Partial<BusinessDeliveryZoneInput> = {}) {
    setLoading(true);
    setError(null);
    const input: BusinessDeliveryZoneInput = {
      name,
      municipalityId: municipalityId || null,
      deliveryFee: Number(deliveryFee),
      estimatedMinutes: Number(estimatedMinutes),
      isActive,
      ...overrides,
    };
    const response = await fetch(`/api/negocio/zonas-de-entrega/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json();
    setLoading(false);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar la zona."));
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la zona "${zone.name}"?`)) return;
    setLoading(true);
    await fetch(`/api/negocio/zonas-de-entrega/${zone.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3">
      <div className="grid gap-2 sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto_auto]">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => save()} placeholder="Nombre de la zona" />
        <div className="flex flex-col gap-1">
          <Select value={municipalityId} onValueChange={(v) => { setMunicipalityId(v); void save({ municipalityId: v }); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cualquier municipio" />
            </SelectTrigger>
            <SelectContent>
              {municipalities.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MunicipalityHint municipalities={municipalities} municipalityId={municipalityId} />
        </div>
        <Input
          type="number"
          min="0"
          step="0.5"
          value={deliveryFee}
          onChange={(e) => setDeliveryFee(e.target.value)}
          onBlur={() => save()}
          placeholder="Costo"
        />
        <Input
          type="number"
          min="10"
          step="5"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          onBlur={() => save()}
          placeholder="Minutos"
        />
        <div className="flex items-center justify-center gap-2">
          <Switch checked={isActive} onCheckedChange={(checked) => { setIsActive(checked); void save({ isActive: checked }); }} />
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} aria-label="Eliminar zona">
          {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ZonesManager({
  zones,
  municipalities,
}: {
  zones: BusinessDeliveryZoneDTO[];
  municipalities: MunicipalityDTO[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("3.50");
  const [estimatedMinutes, setEstimatedMinutes] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/negocio/zonas-de-entrega", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        municipalityId: municipalityId || null,
        deliveryFee: Number(deliveryFee),
        estimatedMinutes: Number(estimatedMinutes),
        isActive: true,
      } satisfies BusinessDeliveryZoneInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear la zona."));
      return;
    }
    setName("");
    setMunicipalityId("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4">
        <p className="text-sm font-medium text-neutral-900">Agregar zona de entrega</p>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-1">
            <Label className="sr-only">Nombre</Label>
            <Input required placeholder="Ej. San Salvador Centro" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Select value={municipalityId} onValueChange={setMunicipalityId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cualquier municipio" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MunicipalityHint municipalities={municipalities} municipalityId={municipalityId} />
          </div>
          <Input
            type="number"
            min="0"
            step="0.5"
            required
            placeholder="Costo"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
          />
          <Input
            type="number"
            min="10"
            step="5"
            required
            placeholder="Minutos"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus />}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {zones.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
          Todavía no tenés zonas de entrega configuradas.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {zones.map((zone) => (
            <ZoneRow key={zone.id} zone={zone} municipalities={municipalities} />
          ))}
        </div>
      )}
    </div>
  );
}
