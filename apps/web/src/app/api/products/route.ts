import { NextRequest } from "next/server";
import { productFiltersSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listProducts } from "@/lib/services/product-service";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = productFiltersSchema.parse(params);

    const result = await listProducts(
      {
        categorySlug: parsed.categoria,
        occasionSlug: parsed.emocion ?? parsed.ocasion,
        minPrice: parsed.precioMin,
        maxPrice: parsed.precioMax,
        municipalitySlug: parsed.ubicacion,
        availableToday: parsed.disponibleHoy,
        onSale: parsed.oferta,
        sort: parsed.orden,
        query: parsed.q,
      },
      { page: parsed.page, pageSize: parsed.pageSize },
    );

    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
