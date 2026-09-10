"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart/cart-context";
import type { DeliveryWindow } from "@mimo/types";
import type { MunicipalityDTO } from "@mimo/types";

const DELIVERY_WINDOWS: { value: DeliveryWindow; label: string }[] = [
  { value: "ASAP", label: "Lo antes posible" },
  { value: "MORNING", label: "9 AM – 12 PM" },
  { value: "MIDDAY", label: "12 PM – 3 PM" },
  { value: "AFTERNOON", label: "3 PM – 6 PM" },
  { value: "EVENING", label: "6 PM – 9 PM" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckoutForm({
  municipalities,
  defaultBuyer,
}: {
  municipalities: MunicipalityDTO[];
  defaultBuyer: { name: string; email: string };
}) {
  const router = useRouter();
  const { items, subtotal, clear, isHydrated } = useCart();

  const [buyerName, setBuyerName] = useState(defaultBuyer.name);
  const [buyerEmail, setBuyerEmail] = useState(defaultBuyer.email);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [reference, setReference] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayISO());
  const [deliveryWindow, setDeliveryWindow] = useState<DeliveryWindow>("ASAP");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [isSurpriseMode, setIsSurpriseMode] = useState(false);
  const [surpriseInstructions, setSurpriseInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isHydrated && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShoppingBag className="size-8 text-neutral-300" />
        <p className="text-neutral-600">Tu carrito está vacío.</p>
        <Button asChild variant="outline">
          <Link href="/regalos">Explorar regalos</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName,
        buyerEmail,
        buyerPhone,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          personalization: item.personalization,
        })),
        address: {
          recipientName,
          recipientPhone,
          addressLine,
          reference: reference || undefined,
          municipalityId,
          deliveryDate,
          deliveryWindow,
          deliveryInstructions: deliveryInstructions || undefined,
        },
        isSurpriseMode,
        hideBuyerFromRecipient: isSurpriseMode,
        surpriseInstructions: isSurpriseMode ? surpriseInstructions || undefined : undefined,
        paymentProvider: "CASH",
      }),
    });
    const body = await response.json();

    if (!body.success) {
      setLoading(false);
      const fieldErrors = body.error?.fieldErrors as Record<string, string[]> | undefined;
      const detail = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
      setError(detail ?? body.error?.message ?? "No pudimos procesar tu pedido.");
      return;
    }

    clear();
    router.push(`/pedidos/${body.data.orderNumber}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Comprador</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyer-name">Nombre</Label>
              <Input id="buyer-name" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyer-phone">Teléfono</Label>
              <Input
                id="buyer-phone"
                required
                maxLength={8}
                placeholder="7000-0000"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value.replace(/[^\d]/g, ""))}
              />
              <p className="text-xs text-neutral-400">8 dígitos, empieza con 2, 6 o 7</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="buyer-email">Correo</Label>
            <Input
              id="buyer-email"
              type="email"
              required
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Destinatario</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient-name">Nombre</Label>
              <Input
                id="recipient-name"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient-phone">Teléfono</Label>
              <Input
                id="recipient-phone"
                required
                maxLength={8}
                placeholder="7000-0000"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value.replace(/[^\d]/g, ""))}
              />
              <p className="text-xs text-neutral-400">8 dígitos, empieza con 2, 6 o 7</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              required
              placeholder="Calle, colonia, número de casa"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Punto de referencia (opcional)</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="municipality">Municipio</Label>
            <Select value={municipalityId} onValueChange={setMunicipalityId} required>
              <SelectTrigger id="municipality" className="w-full">
                <SelectValue placeholder="Seleccioná un municipio" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((municipality) => (
                  <SelectItem key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Entrega</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delivery-date">Fecha</Label>
              <Input
                id="delivery-date"
                type="date"
                required
                min={todayISO()}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delivery-window">Horario</Label>
              <Select value={deliveryWindow} onValueChange={(v) => setDeliveryWindow(v as DeliveryWindow)}>
                <SelectTrigger id="delivery-window" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_WINDOWS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery-instructions">Instrucciones para la entrega (opcional)</Label>
            <Textarea
              id="delivery-instructions"
              rows={2}
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">Enviar como sorpresa</p>
              <p className="text-xs text-neutral-500">
                Ocultamos tu nombre al destinatario y permitimos instrucciones especiales.
              </p>
            </div>
            <Switch checked={isSurpriseMode} onCheckedChange={setIsSurpriseMode} />
          </div>
          {isSurpriseMode && (
            <Textarea
              placeholder="Ej. No llamar, entregar en recepción y avisarme solo a mí."
              rows={2}
              value={surpriseInstructions}
              onChange={(e) => setSurpriseInstructions(e.target.value)}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Pago</h2>
          <RadioGroup value="CASH" className="flex flex-col gap-2">
            <label className="flex items-center gap-3 rounded-xl border border-neutral-900 bg-neutral-50 p-3">
              <RadioGroupItem value="CASH" id="pay-cash" />
              <span className="text-sm font-medium text-neutral-900">Pago contra entrega (efectivo)</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 opacity-50">
              <RadioGroupItem value="CARD" id="pay-card" disabled />
              <span className="text-sm text-neutral-500">Tarjeta — próximamente</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 opacity-50">
              <RadioGroupItem value="PAYPAL" id="pay-paypal" disabled />
              <span className="text-sm text-neutral-500">PayPal — próximamente</span>
            </label>
          </RadioGroup>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-neutral-200 p-4 lg:sticky lg:top-24">
        <p className="mb-3 text-sm font-semibold text-neutral-900">Resumen</p>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm text-neutral-600">
              <span className="line-clamp-1">
                {item.quantity}× {item.productName}
              </span>
              <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-sm">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium text-neutral-900">${subtotal.toFixed(2)}</span>
        </div>
        <p className="mt-1 text-xs text-neutral-400">El costo de envío se calcula al confirmar.</p>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !municipalityId} className="mt-4 h-11 w-full">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Confirmar pedido"}
        </Button>
      </aside>
    </form>
  );
}
