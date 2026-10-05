"use client";

import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";

/**
 * Aviso del panel cuando el negocio no aceptó la versión vigente del Acuerdo
 * MIMO ↔ negocio (se registró antes de que existiera, o se publicó una
 * versión nueva). Aceptar requiere un clic explícito sobre la casilla — no
 * hay botón de "aceptar" que se pueda tocar sin haber marcado que se leyó.
 */
export function AgreementBanner({ version }: { version: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/negocio/acuerdo", {
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
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">Falta aceptar el Acuerdo MIMO ↔ negocio</p>
          <p className="mt-0.5 text-sm text-neutral-600">
            Regula la comisión, los pagos, las cancelaciones y las responsabilidades de cada parte. Es requisito para
            que tu negocio sea aprobado y siga publicado.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-neutral-900"
            />
            <span>
              Leí y acepto el{" "}
              <Link href="/terminos-negocios" target="_blank" className="underline hover:text-neutral-900">
                Acuerdo MIMO ↔ negocio
              </Link>{" "}
              (versión {version}).
            </span>
          </label>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button size="sm" className="mt-3" disabled={!checked || loading} onClick={accept}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Aceptar acuerdo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
