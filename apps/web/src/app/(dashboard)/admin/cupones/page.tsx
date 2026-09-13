import { CouponManager } from "@/components/admin/coupon-manager";
import { listAdminCoupons } from "@/lib/services/admin-coupon-service";

export default async function AdminCouponsPage() {
  const coupons = await listAdminCoupons();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Cupones</h1>
        <p className="text-sm text-neutral-500">
          Códigos de descuento para el checkout — aplican al subtotal de todo el carrito, sin importar cuántos
          negocios tenga.
        </p>
      </div>
      <CouponManager coupons={coupons} />
    </div>
  );
}
