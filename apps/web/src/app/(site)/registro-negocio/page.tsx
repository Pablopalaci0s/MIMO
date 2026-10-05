import type { Metadata } from "next";
import { BusinessApplicationForm } from "@/components/account/business-application-form";
import { listMunicipalities } from "@/lib/services/location-service";

export const metadata: Metadata = {
  title: "Sumá tu negocio",
  description: "Postulá tu floristería, dulcería o negocio de regalos a MIMO.",
};

export default async function RegisterBusinessPage() {
  const municipalities = await listMunicipalities();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Sumá tu negocio a MIMO</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Centralizá tu catálogo y tus pedidos en un solo lugar. Revisamos cada solicitud antes de publicarla.
      </p>

      <div className="mt-4 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-600">
        <p className="font-medium text-neutral-900">Para aprobarte vas a necesitar</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Tu DUI (frente y reverso).</li>
          <li>Una foto tuya sosteniendo el DUI.</li>
          <li>Opcional: NIT/NRC y permisos de tu actividad.</li>
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Los subís desde tu panel apenas termines de registrarte. Se guardan en forma privada y solo los usamos para
          verificarte.
        </p>
      </div>

      <div className="mt-8">
        <BusinessApplicationForm municipalities={municipalities} />
      </div>
    </div>
  );
}
