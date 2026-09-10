import { NextRequest } from "next/server";
import { businessProductInputSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { createBusinessProduct, listBusinessProducts } from "@/lib/services/business-product-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET() {
  try {
    const businessId = await requireBusinessId();
    const products = await listBusinessProducts(businessId);
    return apiSuccess(products);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await requireBusinessId();
    const body = await request.json();
    const input = businessProductInputSchema.parse(body);

    const product = await createBusinessProduct(businessId, input);
    return apiSuccess(product, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
