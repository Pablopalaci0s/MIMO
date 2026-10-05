import { NextRequest } from "next/server";
import { z } from "zod";
import { supportAdminReplySchema } from "@mimo/validation";
import { apiErrorFromException, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/services/admin-service";
import { agentReply, getAdminSupportConversation } from "@/lib/services/support-service";

const idSchema = z.string().uuid();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin();
    const id = idSchema.parse((await params).id);
    const { message } = supportAdminReplySchema.parse(await request.json());

    await agentReply(id, adminId, message);
    return apiSuccess(await getAdminSupportConversation(id), 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
