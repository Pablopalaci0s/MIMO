import { NextRequest } from "next/server";
import { z } from "zod";
import { supportAdminUpdateSchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/services/admin-service";
import {
  getAdminSupportConversation,
  reopenSupportConversation,
  resolveSupportConversation,
} from "@/lib/services/support-service";

const idSchema = z.string().uuid();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const id = idSchema.parse((await params).id);
    return apiSuccess(await getAdminSupportConversation(id));
  } catch (error) {
    return apiErrorFromException(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const id = idSchema.parse((await params).id);
    const { action } = supportAdminUpdateSchema.parse(await request.json());

    if (action === "resolve") await resolveSupportConversation(id, adminId);
    else await reopenSupportConversation(id, adminId);
    return apiSuccess(await getAdminSupportConversation(id));
  } catch (error) {
    return apiErrorFromException(error);
  }
}
