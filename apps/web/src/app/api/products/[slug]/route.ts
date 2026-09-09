import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getProductBySlug } from "@/lib/services/product-service";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) {
      return apiError("NOT_FOUND", "Producto no encontrado", 404);
    }
    return apiSuccess(product);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
