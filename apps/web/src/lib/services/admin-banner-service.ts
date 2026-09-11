import { prisma } from "@mimo/database";
import type { AdminBannerDTO, AdminBannerInput } from "@mimo/types";
import { AppError } from "@/lib/errors";

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

export async function createAdminBanner(input: AdminBannerInput): Promise<AdminBannerDTO> {
  const banner = await prisma.banner.create({
    data: {
      title: input.title,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl || null,
      isActive: input.isActive,
      position: input.position,
    },
  });
  return toAdminBannerDTO(banner);
}

export async function updateAdminBanner(bannerId: string, input: AdminBannerInput): Promise<AdminBannerDTO> {
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
  return toAdminBannerDTO(banner);
}

export async function deleteAdminBanner(bannerId: string): Promise<void> {
  const existing = await prisma.banner.findUnique({ where: { id: bannerId } });
  if (!existing) throw new AppError("NOT_FOUND", "No encontramos ese banner.", 404);

  await prisma.banner.delete({ where: { id: bannerId } });
}
