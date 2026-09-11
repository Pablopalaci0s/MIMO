import type { MetadataRoute } from "next";
import { prisma } from "@mimo/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const STATIC_ROUTES = ["", "/regalos", "/ayuda", "/ayudame-a-elegir", "/terminos", "/privacidad"];

/**
 * Solo lo público e indexable: productos activos y negocios aprobados.
 * Consulta directo a Prisma (no pasa por un `*-service.ts`) porque es una
 * proyección mínima de solo lectura para un archivo especial de Next, no
 * lógica de negocio — no vale la pena una función de servicio para esto.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, businesses] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, business: { status: "APPROVED", deletedAt: null } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.business.findMany({
      where: { status: "APPROVED", deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route}`,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${APP_URL}/productos/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const businessEntries: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${APP_URL}/negocios/${business.slug}`,
    lastModified: business.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries, ...businessEntries];
}
