import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentUploader } from "@/components/negocio/document-uploader";
import { PrivacyConsentCard } from "@/components/negocio/privacy-consent-card";
import {
  DOCUMENT_PURPOSE_STATEMENT,
  DOCUMENT_RETENTION_CLOSED_DAYS,
  DOCUMENT_RETENTION_REJECTED_DAYS,
  PRIVACY_POLICY_VERSION,
} from "@/lib/legal/privacy";
import { listBusinessDocuments } from "@/lib/services/business-document-service";
import { hasAcceptedCurrentPrivacy } from "@/lib/services/business-privacy-service";
import { requireBusinessId } from "@/lib/services/business-service";
import { missingRequiredDocuments } from "@mimo/validation";

export const metadata: Metadata = { title: "Verificación — MIMO" };

export default async function BusinessVerificationPage() {
  const businessId = await requireBusinessId();
  const [documents, privacyAccepted] = await Promise.all([
    listBusinessDocuments(businessId),
    hasAcceptedCurrentPrivacy(businessId),
  ]);
  const missing = missingRequiredDocuments(
    documents.filter((document) => !document.rejectionReason).map((document) => document.type),
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Verificación del negocio</h1>
        <p className="text-sm text-neutral-500">
          Para aprobar tu negocio necesitamos confirmar quién sos.{" "}
          {missing.length === 0
            ? "Ya subiste los documentos obligatorios: el equipo de MIMO los revisa y te avisa."
            : `Faltan ${missing.length} documento${missing.length === 1 ? "" : "s"} obligatorio${missing.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
        <Lock className="mt-0.5 size-4 shrink-0 text-neutral-400" />
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-neutral-900">{DOCUMENT_PURPOSE_STATEMENT}</p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              Nunca se muestra en el Sitio ni a los clientes, y no se comparte con otros negocios ni con terceros
              (salvo que una ley o autoridad lo exija).
            </li>
            <li>
              Solo lo ven administradores autorizados de MIMO, y cada vez que uno lo abre queda registrado.
            </li>
            <li>No se usa para marketing.</li>
            <li>
              Si rechazamos tu solicitud, lo borramos a los {DOCUMENT_RETENTION_REJECTED_DAYS} días; si das de baja
              tu negocio, a los {DOCUMENT_RETENTION_CLOSED_DAYS} días. Mientras tu negocio esté activo lo
              conservamos, y podés pedir que lo borremos cuando quieras desde Ayuda.
            </li>
          </ul>
          <p>
            Más detalle en la{" "}
            <Link href="/privacidad" className="underline hover:text-neutral-900">
              Política de privacidad
            </Link>
            .
          </p>
        </div>
      </div>

      {privacyAccepted ? (
        <DocumentUploader documents={documents} />
      ) : (
        <>
          <PrivacyConsentCard version={PRIVACY_POLICY_VERSION} />
          <div className="pointer-events-none opacity-50" aria-hidden>
            <DocumentUploader documents={documents} />
          </div>
        </>
      )}
    </div>
  );
}
