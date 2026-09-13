import type { Metadata } from "next";
import { BusinessProfileForm } from "@/components/negocio/business-profile-form";
import { getBusinessProfile } from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export const metadata: Metadata = { title: "Perfil del negocio — MIMO" };

export default async function BusinessProfilePage() {
  const businessId = await requireBusinessId();
  const profile = await getBusinessProfile(businessId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Perfil</h1>
        <p className="text-sm text-neutral-500">Así te ven los clientes en tu página pública.</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 dark:bg-neutral-100">
        <BusinessProfileForm profile={profile} />
      </div>
    </div>
  );
}
