import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getBusinessBySlug } from "@/lib/services/business-service";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return apiError("NOT_FOUND", "Negocio no encontrado", 404);
    }
    return apiSuccess(business);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
