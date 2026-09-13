import { NextRequest } from "next/server";
import { adminCouponInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createAdminCoupon, listAdminCoupons } from "@/lib/services/admin-coupon-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const coupons = await listAdminCoupons();
    return apiSuccess(coupons);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const input = adminCouponInputSchema.parse(body);

    const coupon = await createAdminCoupon(input);
    return apiSuccess(coupon, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
