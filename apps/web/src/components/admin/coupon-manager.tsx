"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
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
import type { AdminCouponDTO, AdminCouponInput, CouponDiscountType } from "@mimo/types";

function toInput(coupon: AdminCouponDTO): AdminCouponInput {
  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minSubtotal: coupon.minSubtotal,
    maxUses: coupon.maxUses,
    maxUsesPerUser: coupon.maxUsesPerUser,
    expiresAt: coupon.expiresAt,
    isActive: coupon.isActive,
  };
}

function discountLabel(coupon: Pick<AdminCouponDTO, "discountType" | "discountValue">): string {
  return coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${coupon.discountValue.toFixed(2)}`;
}

function CouponRow({ coupon }: { coupon: AdminCouponDTO }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(coupon.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(checked: boolean) {
    setIsActive(checked);
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/cupones/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toInput(coupon), isActive: checked }),
    });
    const body = await response.json();
    setLoading(false);
    if (!body.success) {
      setIsActive(!checked);
      setError(apiErrorMessage(body, "No pudimos actualizar el cupón."));
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
    setLoading(true);
    await fetch(`/api/admin/cupones/${coupon.id}`, { method: "DELETE" });
    router.refresh();
  }

  const usageLabel = coupon.maxUses ? `${coupon.usedCount}/${coupon.maxUses} usos` : `${coupon.usedCount} usos`;
  const expired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between ${
        isActive && !expired ? "" : "opacity-60"
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tracking-wide text-neutral-900">{coupon.code}</span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
            {discountLabel(coupon)}
          </span>
          {expired && <span className="text-xs font-medium text-destructive">Vencido</span>}
        </div>
        {coupon.description && <p className="mt-0.5 text-sm text-neutral-500">{coupon.description}</p>}
        <p className="mt-0.5 text-xs text-neutral-400">
          {usageLabel}
          {coupon.minSubtotal ? ` · mínimo $${coupon.minSubtotal.toFixed(2)}` : ""}
          {coupon.maxUsesPerUser ? ` · máx ${coupon.maxUsesPerUser} por cliente` : ""}
          {coupon.expiresAt ? ` · vence ${new Date(coupon.expiresAt).toLocaleDateString("es-SV")}` : ""}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isActive} disabled={loading} onCheckedChange={toggleActive} />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={loading}
          aria-label="Eliminar cupón"
          className="text-neutral-400 hover:bg-destructive/10 hover:text-destructive"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
    </div>
  );
}

export function CouponManager({ coupons }: { coupons: AdminCouponDTO[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/cupones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        description: description || undefined,
        discountType,
        discountValue: Number(discountValue),
        minSubtotal: minSubtotal ? Number(minSubtotal) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : undefined,
        expiresAt: expiresAt || undefined,
        isActive: true,
      } satisfies AdminCouponInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear el cupón."));
      return;
    }
    setCode("");
    setDescription("");
    setDiscountValue("");
    setMinSubtotal("");
    setMaxUses("");
    setExpiresAt("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4"
      >
        <div className="flex items-center gap-1.5">
          <Plus className="size-4 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-900">Crear cupón</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Código</Label>
            <Input
              required
              placeholder="BIENVENIDO10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Tipo de descuento</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as CouponDiscountType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">% del subtotal</SelectItem>
                <SelectItem value="FIXED_AMOUNT">Monto fijo (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">
              Valor {discountType === "PERCENTAGE" ? "(%)" : "(USD)"}
            </Label>
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-neutral-500">Descripción (opcional, para tu referencia)</Label>
          <Input
            placeholder="Ej. campaña de lanzamiento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Mínimo de compra (opcional)</Label>
            <Input type="number" min="0" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Usos totales (opcional)</Label>
            <Input type="number" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Usos por cliente</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={maxUsesPerUser}
              onChange={(e) => setMaxUsesPerUser(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-neutral-500">Vence (opcional)</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Crear cupón
        </Button>
      </form>

      {coupons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
          Todavía no hay cupones.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((coupon) => (
            <CouponRow key={coupon.id} coupon={coupon} />
          ))}
        </div>
      )}
    </div>
  );
}
