import type { Metadata } from "next";
import { HoursForm } from "@/components/negocio/hours-form";
import { getBusinessHours } from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export const metadata: Metadata = { title: "Horarios — MIMO" };

export default async function BusinessHoursPage() {
  const businessId = await requireBusinessId();
  const hours = await getBusinessHours(businessId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Horarios</h1>
        <p className="text-sm text-neutral-500">Definí cuándo atendés y tu tiempo de preparación.</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5">
        <HoursForm initial={hours} />
      </div>
    </div>
  );
}
