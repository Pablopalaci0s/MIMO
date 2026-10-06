"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";
import { DOCUMENT_PURPOSE_STATEMENT } from "@/lib/legal/privacy";

/**
 * Paso previo a subir el DUI: aceptar la Política de privacidad. Aparece para
 * los negocios que se registraron antes de que existiera este consentimiento,
 * o cuando la política cambia de versión. Los que se registran ahora ya lo
 * dieron en el formulario.
 */
export function PrivacyConsentCard({ version }: { version: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/negocio/privacidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "No pudimos registrar tu aceptación."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">Antes de subir tus documentos</p>
          <p className="mt-0.5 text-sm text-neutral-600">
            Te pedimos tu DUI y una foto tuya. {DOCUMENT_PURPOSE_STATEMENT}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-neutral-900"
            />
            <span>
              Leí y acepto la{" "}
              <Link href="/privacidad" target="_blank" className="underline hover:text-neutral-900">
                Política de privacidad
              </Link>{" "}
              (versión {version}).
            </span>
          </label>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button size="sm" className="mt-3" disabled={!checked || loading} onClick={accept}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Aceptar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
