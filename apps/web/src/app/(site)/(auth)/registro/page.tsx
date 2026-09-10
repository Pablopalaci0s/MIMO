"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const body = await response.json();

    if (!body.success) {
      setLoading(false);
      setError(apiErrorMessage(body, "No pudimos crear tu cuenta."));
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-neutral-500">Es gratis y toma un minuto.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
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
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>

        <p className="text-xs text-neutral-400">
          Al crear tu cuenta aceptás nuestros{" "}
          <Link href="/terminos" className="underline hover:text-neutral-600">
            Términos
          </Link>{" "}
          y nuestra{" "}
          <Link href="/privacidad" className="underline hover:text-neutral-600">
            Política de privacidad
          </Link>
          .
        </p>
      </form>

      <p className="text-sm text-neutral-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/iniciar-sesion" className="font-medium text-neutral-900 underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
