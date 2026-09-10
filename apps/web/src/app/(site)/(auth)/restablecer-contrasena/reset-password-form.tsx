"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(body.error?.message ?? "No pudimos restablecer tu contraseña.");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Este link no es válido. Pedí uno nuevo desde{" "}
        <Link href="/olvide-mi-contrasena" className="underline">
          recuperar contraseña
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <p className="text-sm text-neutral-600">Tu contraseña se actualizó. Ya podés iniciar sesión.</p>
        <Button asChild className="h-10 w-full">
          <Link href="/iniciar-sesion">Iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <span className="text-xs text-neutral-400">Mínimo 8 caracteres, con mayúscula y número.</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="h-10">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
