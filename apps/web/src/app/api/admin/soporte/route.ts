import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/services/admin-service";
import { listAdminSupportConversations } from "@/lib/services/support-service";

const filterSchema = z.enum(["pending", "resolved", "bot", "all"]).default("pending");

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const filter = filterSchema.parse(request.nextUrl.searchParams.get("filtro") ?? undefined);
    return apiSuccess(await listAdminSupportConversations(filter));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
