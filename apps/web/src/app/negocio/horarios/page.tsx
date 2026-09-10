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
      <h2 className="text-lg font-semibold text-neutral-900">Horarios y tiempo de preparación</h2>
      <HoursForm initial={hours} />
    </div>
  );
}
