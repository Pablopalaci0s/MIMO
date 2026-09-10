import type { Metadata } from "next";
import { BusinessApplicationForm } from "@/components/account/business-application-form";
import { listMunicipalities } from "@/lib/services/location-service";

export const metadata: Metadata = {
  title: "Sumá tu negocio — MIMO",
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

      <div className="mt-8">
        <BusinessApplicationForm municipalities={municipalities} />
      </div>
    </div>
  );
}
