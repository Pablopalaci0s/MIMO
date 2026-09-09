import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { listCategories, listEmotions, listOccasions } from "@/lib/services/catalog-service";

export async function GET() {
  try {
    const [categories, occasions, emotions] = await Promise.all([
      listCategories(),
      listOccasions(),
      listEmotions(),
    ]);
    return apiSuccess({ categories, occasions, emotions });
  } catch (error) {
    return apiErrorFromException(error);
  }
}
