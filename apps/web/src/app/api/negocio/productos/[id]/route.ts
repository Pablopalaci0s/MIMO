import { NextRequest } from "next/server";
import { businessProductInputSchema } from "@mimo/validation";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import {
  deleteBusinessProduct,
  getBusinessProductById,
  updateBusinessProduct,
} from "@/lib/services/business-product-service";
import { requireBusinessId } from "@/lib/services/business-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { id } = await params;
    const product = await getBusinessProductById(businessId, id);
    if (!product) return apiError("NOT_FOUND", "Producto no encontrado", 404);
    return apiSuccess(product);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { id } = await params;
    const body = await request.json();
    const input = businessProductInputSchema.parse(body);

    const product = await updateBusinessProduct(businessId, id, input);
    return apiSuccess(product);
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const businessId = await requireBusinessId();
    const { id } = await params;
    await deleteBusinessProduct(businessId, id);
    return apiSuccess({ id });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
