"use client";

import { CheckCircle2, Circle, FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";
import {
  BUSINESS_DOCUMENT_SPECS,
  BUSINESS_DOCUMENT_TYPES,
  FILE_KIND_MIME,
  type BusinessDocumentTypeValue,
} from "@mimo/validation";
import type { BusinessDocumentDTO } from "@mimo/types";

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentSlot({
  type,
  uploaded,
}: {
  type: BusinessDocumentTypeValue;
  uploaded: BusinessDocumentDTO | undefined;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spec = BUSINESS_DOCUMENT_SPECS[type];

  async function upload(file: File) {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    const response = await fetch("/api/negocio/documentos", { method: "POST", body: formData });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "No pudimos subir el archivo."));
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center">
      {uploaded ? (
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="size-5 shrink-0 text-neutral-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{spec.label}</p>
        <p className="text-xs text-neutral-500">{spec.description}</p>
        {uploaded && (
          <p className="mt-1 text-xs text-neutral-400">
            Subido el {new Date(uploaded.uploadedAt).toLocaleDateString("es-SV")} · {formatSize(uploaded.sizeBytes)} ·{" "}
            <a
              href={`/api/negocio/documentos/${type}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-600"
            >
              Ver
            </a>
          </p>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={spec.accepts.map((kind) => FILE_KIND_MIME[kind]).join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant={uploaded ? "outline" : "default"}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
        {uploaded ? "Reemplazar" : "Subir"}
      </Button>
    </li>
  );
}

/** Lista de documentos de verificación del titular, con su estado y botón para subir. */
export function DocumentUploader({ documents }: { documents: BusinessDocumentDTO[] }) {
  const byType = new Map(documents.map((document) => [document.type, document]));
  return (
    <ul className="flex flex-col gap-3">
      {BUSINESS_DOCUMENT_TYPES.map((type) => (
        <DocumentSlot key={type} type={type} uploaded={byType.get(type)} />
      ))}
    </ul>
  );
}
