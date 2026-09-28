import { Prisma, prisma } from "@mimo/database";
import type { AdminReportDTO } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { logAdminAction } from "./admin-audit-service";

const REPORT_INCLUDE = {
  reporter: true,
} satisfies Prisma.ReportInclude;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

/** Resuelve un nombre legible para el objetivo reportado — el reporte solo
 * guarda `targetType`/`targetId` genéricos, así que hay que ir a buscar el
 * nombre a la tabla correspondiente en vez de mostrar un uuid pelado. */
async function resolveTargetLabel(targetType: ReportRow["targetType"], targetId: string): Promise<string | null> {
  switch (targetType) {
    case "PRODUCT": {
      const product = await prisma.product.findUnique({ where: { id: targetId }, select: { name: true } });
      return product?.name ?? null;
    }
    case "BUSINESS": {
      const business = await prisma.business.findUnique({ where: { id: targetId }, select: { name: true } });
      return business?.name ?? null;
    }
    case "REVIEW": {
      const review = await prisma.review.findUnique({ where: { id: targetId }, select: { comment: true } });
      return review?.comment ? review.comment.slice(0, 60) : "Reseña sin comentario";
    }
    case "USER": {
      const user = await prisma.user.findUnique({ where: { id: targetId }, select: { name: true } });
      return user?.name ?? null;
    }
    default:
      return null;
  }
}

async function toAdminReportDTO(report: ReportRow): Promise<AdminReportDTO> {
  return {
    id: report.id,
    reporterName: report.reporter.name,
    targetType: report.targetType,
    targetId: report.targetId,
    targetLabel: await resolveTargetLabel(report.targetType, report.targetId),
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}

export async function listAdminReports(): Promise<AdminReportDTO[]> {
  const reports = await prisma.report.findMany({
    include: REPORT_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return Promise.all(reports.map(toAdminReportDTO));
}

export async function updateAdminReportStatus(
  reportId: string,
  status: AdminReportDTO["status"],
  adminId: string,
): Promise<AdminReportDTO> {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese reporte.", 404);

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status },
    include: REPORT_INCLUDE,
  });

  await logAdminAction({
    adminId,
    action: "report.update_status",
    targetType: "REPORT",
    targetId: reportId,
    metadata: { status },
  });

  return toAdminReportDTO(report);
}
