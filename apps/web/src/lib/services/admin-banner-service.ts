import { prisma } from "@mimo/database";
import type { AdminBannerDTO, AdminBannerInput } from "@mimo/types";
import { AppError } from "@/lib/errors";
import { logAdminAction } from "./admin-audit-service";

function toAdminBannerDTO(banner: {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
}): AdminBannerDTO {
  return {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    isActive: banner.isActive,
    position: banner.position,
    createdAt: banner.createdAt.toISOString(),
  };
}

export async function listAdminBanners(): Promise<AdminBannerDTO[]> {
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
  return banners.map(toAdminBannerDTO);
}

export async function createAdminBanner(input: AdminBannerInput, adminId: string): Promise<AdminBannerDTO> {
  const banner = await prisma.banner.create({
    data: {
      title: input.title,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl || null,
      isActive: input.isActive,
      position: input.position,
    },
  });

  await logAdminAction({
    adminId,
    action: "banner.create",
    targetType: "BANNER",
    targetId: banner.id,
    metadata: { title: banner.title },
  });

  return toAdminBannerDTO(banner);
}

export async function updateAdminBanner(
  bannerId: string,
  input: AdminBannerInput,
  adminId: string,
): Promise<AdminBannerDTO> {
  const existing = await prisma.banner.findUnique({ where: { id: bannerId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese banner.", 404);

  const banner = await prisma.banner.update({
    where: { id: bannerId },
    data: {
      title: input.title,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl || null,
      isActive: input.isActive,
      position: input.position,
    },
  });

  await logAdminAction({
    adminId,
    action: "banner.update",
    targetType: "BANNER",
    targetId: bannerId,
    metadata: { title: banner.title, isActive: banner.isActive },
  });

  return toAdminBannerDTO(banner);
}

export async function deleteAdminBanner(bannerId: string, adminId: string): Promise<void> {
  const existing = await prisma.banner.findUnique({ where: { id: bannerId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese banner.", 404);

  await prisma.banner.delete({ where: { id: bannerId } });
  await logAdminAction({
    adminId,
    action: "banner.delete",
    targetType: "BANNER",
    targetId: bannerId,
    metadata: { title: existing.title },
  });
}
