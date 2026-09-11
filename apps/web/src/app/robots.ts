import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Paneles internos (ver `(dashboard)/layout.tsx`, que además pone
      // `noindex` a nivel de metadata) y páginas con datos personales del
      // usuario logueado — nada de esto le sirve a alguien buscando en
      // Google, y no queremos que aparezca ahí.
      disallow: [
        "/admin",
        "/negocio",
        "/checkout",
        "/pedidos",
        "/mis-pedidos",
        "/perfil",
        "/favoritos",
        "/notificaciones",
        "/api",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
