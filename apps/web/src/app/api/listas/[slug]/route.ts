import { NextRequest } from "next/server";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { getPublicRegistry } from "@/lib/services/gift-registry-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const registry = await getPublicRegistry(slug);
    if (!registry) return apiError("NOT_FOUND", "No encontramos esa lista.", 404);
    return apiSuccess(registry);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
