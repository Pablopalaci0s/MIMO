"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(body.error?.message ?? "No pudimos procesar la solicitud.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Escribí tu correo y te mandamos un link para restablecerla.
        </p>
      </div>

      {sent ? (
        <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          Si <strong>{email}</strong> tiene una cuenta en MIMO, te acabamos de mandar un correo
          con instrucciones. Revisá también spam.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="h-10">
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar link"}
          </Button>
        </form>
      )}

      <p className="text-sm text-neutral-500">
        <Link href="/iniciar-sesion" className="font-medium text-neutral-900 underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
