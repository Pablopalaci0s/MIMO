"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Esa cuenta está suspendida.",
  OAuthAccountNotLinked: "Ese correo ya está en uso con otro método de inicio de sesión.",
};

export function LoginForm({ oauthProviders }: { oauthProviders: { google: boolean; facebook: boolean } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const oauthError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    oauthError ? (OAUTH_ERROR_MESSAGES[oauthError] ?? "No pudimos iniciar sesión con ese proveedor.") : null,
  );
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <OAuthButtons providers={oauthProviders} callbackUrl={callbackUrl} />

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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/olvide-mi-contrasena" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="h-10">
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="text-sm text-neutral-500">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-neutral-900 underline">
          Registrate
        </Link>
      </p>
    </>
  );
}
