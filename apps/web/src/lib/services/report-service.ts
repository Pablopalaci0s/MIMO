import { prisma } from "@mimo/database";
import type { ReportInput, ReportTargetType } from "@mimo/types";
import { AppError } from "@/lib/errors";

async function assertTargetExists(targetType: ReportTargetType, targetId: string): Promise<void> {
  const exists = await (async () => {
    switch (targetType) {
      case "PRODUCT":
        return prisma.product.findUnique({ where: { id: targetId }, select: { id: true } });
      case "BUSINESS":
        return prisma.business.findUnique({ where: { id: targetId }, select: { id: true } });
      case "REVIEW":
        return prisma.review.findUnique({ where: { id: targetId }, select: { id: true } });
      case "USER":
        return prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    }
  })();
  if (!exists) throw new AppError("NOT_FOUND", "No encontramos lo que estás intentando reportar.", 404);
}

export async function createReport(reporterId: string, input: ReportInput): Promise<{ id: string }> {
  await assertTargetExists(input.targetType, input.targetId);

  const report = await prisma.report.create({
    data: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
      status: "OPEN",
    },
    select: { id: true },
  });
  return report;
}
