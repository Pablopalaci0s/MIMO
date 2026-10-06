import { ArrowLeft, FileText, Lock, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { DeleteDocumentsButton } from "@/components/admin/delete-documents-button";
import { RejectDocumentForm } from "@/components/admin/reject-document-form";
import { AppError } from "@/lib/errors";
import { requireDocumentReviewer } from "@/lib/services/admin-service";
import { getAdminBusinessForReview } from "@/lib/services/admin-business-service";
import { listBusinessDocuments } from "@/lib/services/business-document-service";
import { BUSINESS_DOCUMENT_SPECS, BUSINESS_DOCUMENT_TYPES } from "@mimo/validation";

export const metadata: Metadata = { title: "Documentos del negocio — MIMO" };

export default async function AdminBusinessDocumentsPage({ params }: PageProps<"/admin/negocios/[id]/documentos">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  // Los documentos de identidad solo los ve un administrador autorizado, no
  // cualquier admin (ver `requireDocumentReviewer`).
  try {
    await requireDocumentReviewer();
  } catch (error) {
    if (error instanceof AppError && error.code === "DOCUMENT_REVIEW_FORBIDDEN") {
      return (
        <div className="flex max-w-xl flex-col items-start gap-3">
          <Link href="/admin/negocios" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="size-3.5" /> Negocios
          </Link>
          <div className="flex items-start gap-3 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
            <Lock className="mt-0.5 size-4 shrink-0 text-neutral-400" />
            <p>
              No tenés permiso para ver documentos de identidad. Pedile a un administrador autorizado que te lo
              otorgue desde Usuarios.
            </p>
          </div>
        </div>
      );
    }
    throw error;
  }

  const [business, documents] = await Promise.all([getAdminBusinessForReview(id), listBusinessDocuments(id)]);
  const byType = new Map(documents.map((document) => [document.type, document]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/negocios" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="size-3.5" /> Negocios
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Documentos de {business.name}</h1>
        <p className="text-sm text-neutral-500">
          Titular: {business.ownerName ?? "—"} ({business.ownerEmail ?? "sin correo"}). Compará el nombre del DUI con el
          del titular y que la foto del titular coincida con el DUI.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-neutral-400" />
        <p>
          Son datos personales sensibles: usalos solo para verificar este negocio. Cada vez que abrís un documento
          queda registrado en la auditoría, con tu nombre.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {BUSINESS_DOCUMENT_TYPES.map((type) => {
          const spec = BUSINESS_DOCUMENT_SPECS[type];
          const document = byType.get(type);
          const href = `/api/admin/negocios/${business.id}/documentos/${type}`;
          return (
            <li key={type} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-900">
                {spec.label}
                {spec.required && <span className="ml-1 text-xs font-normal text-neutral-400">obligatorio</span>}
              </p>
              {!document ? (
                <p className="text-sm text-amber-600">No lo subió todavía.</p>
              ) : document.mimeType === "application/pdf" ? (
                <a
                  href={href}
                  className="flex items-center gap-2 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700 hover:bg-neutral-200"
                >
                  <FileText className="size-4" /> Descargar PDF
                </a>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- documento privado servido por una ruta autenticada; next/image no aplica */}
                  <img
                    src={href}
                    alt={spec.label}
                    className="max-h-64 w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
                  />
                </a>
              )}
              {document && (
                <p className="text-xs text-neutral-400">
                  Subido el {new Date(document.uploadedAt).toLocaleDateString("es-SV")}
                </p>
              )}
              {document?.rejectionReason && (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  Rechazado: {document.rejectionReason}. Esperando que el titular suba uno nuevo.
                </p>
              )}
              {document && !document.rejectionReason && <RejectDocumentForm businessId={business.id} type={type} />}
            </li>
          );
        })}
      </ul>

      {documents.length > 0 && <DeleteDocumentsButton businessId={business.id} />}
    </div>
  );
}
