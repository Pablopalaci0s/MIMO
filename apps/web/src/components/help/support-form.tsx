"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api-error-message";

export function SupportForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos enviar tu consulta."));
      return;
    }
    setTicketCode(typeof body.data?.ticketCode === "string" ? body.data.ticketCode : null);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Recibimos tu consulta{ticketCode ? ` (ticket ${ticketCode})` : ""}.
          </p>
          <p className="text-sm text-neutral-500">Te respondemos a {email} apenas podamos.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">¿Seguís con dudas?</p>
        <p className="text-sm text-neutral-500">
          Para dudas de un pedido puntual, escribile al negocio desde la sección «Mensajes» de tu pedido. Para
          todo lo demás (la plataforma, tu cuenta, un negocio que no encontrás), escribinos acá.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="support-name">Nombre</Label>
          <Input id="support-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="support-email">Correo</Label>
          <Input
            id="support-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support-message">Mensaje</Label>
        <Textarea
          id="support-message"
          required
          minLength={10}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="h-10 w-fit">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar consulta"}
      </Button>
    </form>
  );
}
