import { prisma } from "@mimo/database";
import type { BannerDTO } from "@mimo/types";

export async function listActiveBanners(): Promise<BannerDTO[]> {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
  return banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
  }));
}
