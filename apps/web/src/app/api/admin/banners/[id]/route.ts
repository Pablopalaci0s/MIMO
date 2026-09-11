import { NextRequest } from "next/server";
import { adminBannerInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { deleteAdminBanner, updateAdminBanner } from "@/lib/services/admin-banner-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = adminBannerInputSchema.parse(body);

    const banner = await updateAdminBanner(id, input);
    return apiSuccess(banner);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteAdminBanner(id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
