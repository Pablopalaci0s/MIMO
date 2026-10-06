"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-error-message";

interface Duplicate {
  businessId: string;
  businessName: string;
  businessStatus: string;
}

const CRITERIA = [
  { key: "documentLegible", label: "El documento es legible" },
  { key: "documentValid", label: "El documento está vigente" },
  { key: "identityMatches", label: "La identidad coincide con la del titular registrado" },
  { key: "photoMatches", label: "La foto del titular coincide con la del DUI" },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];

/**
 * Registra la verificación de identidad (y aprueba el negocio si todavía no
 * estaba aprobado). El admin tipea el número del DUI mirando la imagen: sirve
 * solo para conservar los últimos 4 dígitos y una huella para detectar
 * duplicados — el número completo no se guarda y este campo se limpia apenas
 * se envía.
 */
export function VerifyIdentityForm({ businessId, willApprove }: { businessId: string; willApprove: boolean }) {
  const router = useRouter();
  const [duiNumber, setDuiNumber] = useState("");
  const [checks, setChecks] = useState<Record<CriterionKey, boolean>>({
    documentLegible: false,
    documentValid: false,
    identityMatches: false,
    photoMatches: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);

  const allChecked = CRITERIA.every((criterion) => checks[criterion.key]);

  async function submit(confirmDuplicate: boolean) {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/negocios/${businessId}/verificacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duiNumber, ...checks, confirmDuplicate }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "No pudimos registrar la verificación."));
      return;
    }
    if (body?.data?.requiresConfirmation) {
      setDuplicates(body.data.duplicates);
      return;
    }
    setDuiNumber(""); // el número no se queda en pantalla
    setDuplicates(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">
          Verificar identidad{willApprove ? " y aprobar el negocio" : ""}
        </p>
        <p className="text-xs text-neutral-500">
          Mirá los tres documentos de arriba y confirmá cada punto. Se conserva el registro de que lo verificaste; las
          imágenes se borran automáticamente unos días después de la aprobación.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Número del DUI (solo se guardan los últimos 4 dígitos)
        <Input
          value={duiNumber}
          onChange={(event) => {
            setDuiNumber(event.target.value);
            setDuplicates(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          placeholder="00000000-0"
          className="max-w-48"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        {CRITERIA.map((criterion) => (
          <label key={criterion.key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={checks[criterion.key]}
              onChange={(event) => setChecks((current) => ({ ...current, [criterion.key]: event.target.checked }))}
              className="size-4 shrink-0 accent-neutral-900"
            />
            {criterion.label}
          </label>
        ))}
      </div>

      {duplicates && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-neutral-700 dark:bg-amber-500/10">
          <p className="font-medium text-neutral-900">Este DUI ya fue verificado en otro negocio:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((duplicate) => (
              <li key={duplicate.businessId}>
                {duplicate.businessName} ({duplicate.businessStatus})
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-neutral-500">
            Puede ser el mismo titular con más de un negocio, o alguien que se registra de nuevo. Si confirmás, queda
            registrado.
          </p>
          <Button type="button" size="sm" className="mt-2" disabled={loading} onClick={() => submit(true)}>
            Es el mismo titular, continuar
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="button" size="sm" disabled={loading || !allChecked || duiNumber.trim() === ""} onClick={() => submit(false)}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}
          {willApprove ? "Verificar y aprobar" : "Registrar verificación"}
        </Button>
      </div>
    </div>
  );
}
