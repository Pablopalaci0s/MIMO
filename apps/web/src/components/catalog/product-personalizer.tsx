"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProductPersonalizer() {
  const [recipientName, setRecipientName] = useState("");
  const [dedication, setDedication] = useState("");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
      <p className="text-sm font-semibold text-neutral-900">Personalizá tu regalo</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recipient-name">Nombre del destinatario</Label>
        <Input
          id="recipient-name"
          value={recipientName}
          onChange={(event) => setRecipientName(event.target.value)}
          placeholder="Ej. María"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dedication">Mensaje de dedicatoria</Label>
        <Textarea
          id="dedication"
          value={dedication}
          onChange={(event) => setDedication(event.target.value)}
          placeholder="Escribí lo que querés decirle..."
          rows={3}
        />
      </div>

      <Button disabled className="h-11 w-full">
        Agregar al carrito
      </Button>
      <p className="text-center text-xs text-neutral-400">
        El carrito y el checkout llegan en la Fase 4.
      </p>
    </div>
  );
}
