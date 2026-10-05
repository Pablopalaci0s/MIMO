import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentUploader } from "@/components/negocio/document-uploader";
import { listBusinessDocuments } from "@/lib/services/business-document-service";
import { requireBusinessId } from "@/lib/services/business-service";
import { missingRequiredDocuments } from "@mimo/validation";

export const metadata: Metadata = { title: "Verificación — MIMO" };

export default async function BusinessVerificationPage() {
  const businessId = await requireBusinessId();
  const documents = await listBusinessDocuments(businessId);
  const missing = missingRequiredDocuments(documents.map((document) => document.type));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Verificación del negocio</h1>
        <p className="text-sm text-neutral-500">
          Para aprobar tu negocio necesitamos confirmar quién sos. {" "}
          {missing.length === 0
            ? "Ya subiste los documentos obligatorios: el equipo de MIMO los revisa y te avisa."
            : `Faltan ${missing.length} documento${missing.length === 1 ? "" : "s"} obligatorio${missing.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
        <Lock className="mt-0.5 size-4 shrink-0 text-neutral-400" />
        <p>
          Tus documentos se guardan en forma privada: solo los ves vos y el equipo de MIMO que verifica negocios, y
          cada vez que alguien del equipo abre uno queda registrado. Los usamos únicamente para verificarte. Más
          detalle en la{" "}
          <Link href="/privacidad" className="underline hover:text-neutral-900">
            Política de privacidad
          </Link>
          .
        </p>
      </div>

      <DocumentUploader documents={documents} />
    </div>
  );
}
