"use client";

import { CheckCircle2, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContributePaypalButton } from "./contribute-paypal-button";

export function ContributeForm({ slug, suggestedAmount }: { slug: string; suggestedAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        <CheckCircle2 className="size-5 shrink-0" />
        ¡Gracias por tu aporte! Ya se sumó a la cabuda.
      </div>
    );
  }

  const parsedAmount = Number(amount);
  const validAmount = parsedAmount > 0 && !Number.isNaN(parsedAmount);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="h-11 w-full">
        <Gift className="size-4" /> Quiero aportar
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contributor-name">Tu nombre</Label>
        <Input id="contributor-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Quién aporta?" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contributor-amount">Monto a aportar (USD)</Label>
        <Input
          id="contributor-amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      {name.trim() && validAmount ? (
        <ContributePaypalButton
          slug={slug}
          contributorName={name.trim()}
          amount={parsedAmount}
          onSuccess={() => {
            setConfirmed(true);
            router.refresh();
          }}
        />
      ) : (
        <p className="text-xs text-neutral-400">Completá tu nombre y un monto para ver el botón de pago.</p>
      )}
    </div>
  );
}
