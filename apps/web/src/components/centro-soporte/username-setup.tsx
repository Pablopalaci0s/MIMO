"use client";

import { AlertTriangle, Check, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MimoMark } from "@/components/brand/mimo-mark";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";

/**
 * Primera vez en el centro de soporte: la persona elige su nombre de usuario.
 * Es lo que ven los clientes (en vez de su nombre real) y se puede elegir UNA
 * sola vez — el servidor lo garantiza; esta pantalla solo lo deja claro.
 */
export function UsernameSetup({ fullName, suggested }: { fullName: string; suggested: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(suggested);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || saving) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/centro-soporte/perfil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setSaving(false);
    if (!result?.success) {
      setError(apiErrorMessage(result, "No pudimos guardar tu nombre de usuario."));
      return;
    }
    router.refresh();
  }

  const preview = username.trim().toLowerCase() || "tu.nombre";

  return (
    <div className="flex min-h-screen flex-col bg-sc-rail">
      <header className="flex h-14 items-center px-6">
        <span className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-white">
          MIMO
          <MimoMark className="size-6 text-[#f98079]" />
        </span>
        <span className="mx-3 h-5 w-px bg-white/25" aria-hidden />
        <span className="text-sm text-sc-rail-fg">Centro de soporte</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-7 shadow-2xl dark:bg-neutral-100">
          <span className="flex size-11 items-center justify-center rounded-full bg-sc-primary-soft text-sc-primary">
            <ShieldCheck className="size-5" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">Bienvenido/a, {fullName.split(" ")[0] || "equipo"}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            Antes de empezar, elegí tu <strong className="font-semibold text-neutral-800">nombre de usuario</strong>. Es el nombre que van a ver los clientes cuando les
            respondas: así tu nombre real no queda expuesto.
          </p>

          <label htmlFor="support-username" className="mt-5 block text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Nombre de usuario
          </label>
          <div className="mt-1.5 flex items-center rounded-md border border-neutral-300 bg-white focus-within:border-sc-primary focus-within:ring-2 focus-within:ring-sc-primary/20 dark:bg-neutral-50">
            <span className="pl-3 text-neutral-400" aria-hidden>
              @
            </span>
            <input
              id="support-username"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              maxLength={24}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-10 flex-1 bg-transparent px-1.5 text-base text-neutral-900 outline-none sm:text-sm"
              aria-describedby="support-username-help"
            />
          </div>
          <p id="support-username-help" className="mt-1.5 text-xs text-neutral-500">
            3 a 24 caracteres: letras sin acentos, números, punto, guion o guion bajo. Te sugerimos uno a partir de tu nombre, pero podés cambiarlo ahora.
          </p>

          <div className="mt-4 rounded-md bg-neutral-50 px-3.5 py-3 text-sm text-neutral-700">
            <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">Así te va a ver un cliente</p>
            <p className="mt-1">
              <span className="font-medium text-neutral-900">{preview}</span> <span className="text-neutral-400">· Soporte MIMO</span>
            </p>
          </div>

          <div className="mt-4 flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Solo podés elegirlo una vez.</strong> Después queda fijo y no vas a poder cambiarlo; si hace falta, tiene que cambiarlo un administrador.
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-neutral-700">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-sc-primary" />
            Entiendo que no podré cambiarlo después.
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!confirmed || saving || username.trim().length < 3} className="mt-5 h-10 w-full rounded-md bg-sc-primary text-white hover:bg-sc-primary-hover">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar y entrar
          </Button>
        </form>
      </main>
    </div>
  );
}
