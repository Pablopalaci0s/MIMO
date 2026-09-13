import { NextRequest } from "next/server";
import { adminCouponInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { deleteAdminCoupon, updateAdminCoupon } from "@/lib/services/admin-coupon-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = adminCouponInputSchema.parse(body);

    const coupon = await updateAdminCoupon(id, input, adminId);
    return apiSuccess(coupon);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const { id } = await params;
    await deleteAdminCoupon(id, adminId);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
