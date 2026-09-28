import { NextRequest } from "next/server";
import { adminBannerInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createAdminBanner, listAdminBanners } from "@/lib/services/admin-banner-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const banners = await listAdminBanners();
    return apiSuccess(banners);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin();
    const body = await request.json();
    const input = adminBannerInputSchema.parse(body);

    const banner = await createAdminBanner(input, adminId);
    return apiSuccess(banner, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
