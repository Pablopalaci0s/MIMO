import { BannerManager } from "@/components/admin/banner-manager";
import { listAdminBanners } from "@/lib/services/admin-banner-service";

export default async function AdminBannersPage() {
  const banners = await listAdminBanners();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Banners</h1>
        <p className="text-sm text-neutral-500">
          Se muestran en el home, en el orden indicado. Solo los banners activos son visibles.
        </p>
      </div>
      <BannerManager banners={banners} />
    </div>
  );
}
