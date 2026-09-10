import type { Metadata } from "next";
import { ZonesManager } from "@/components/negocio/zones-manager";
import { listMunicipalities } from "@/lib/services/location-service";
import { listBusinessDeliveryZones } from "@/lib/services/business-settings-service";
import { requireBusinessId } from "@/lib/services/business-service";

export const metadata: Metadata = { title: "Zonas de entrega — MIMO" };

export default async function BusinessDeliveryZonesPage() {
  const businessId = await requireBusinessId();
  const [zones, municipalities] = await Promise.all([
    listBusinessDeliveryZones(businessId),
    listMunicipalities(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Zonas de entrega</h2>
      <ZonesManager zones={zones} municipalities={municipalities} />
    </div>
  );
}
