import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireSupportStaff } from "@/lib/services/support-access-service";
import { listSupportStaff } from "@/lib/services/support-ticket-service";

/** Personal de soporte para asignar tickets (con su carga actual). Solo supervisión. */
export async function GET() {
  try {
    await requireSupportStaff({ manager: true });
    return apiSuccess(await listSupportStaff());
  } catch (error) {
    return apiErrorFromException(error);
  }
}
