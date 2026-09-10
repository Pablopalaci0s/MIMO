import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listAdminBusinesses } from "@/lib/services/admin-business-service";
import { requireAdmin } from "@/lib/services/admin-service";

export async function GET() {
  try {
    await requireAdmin();
    const businesses = await listAdminBusinesses();
    return apiSuccess(businesses);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
