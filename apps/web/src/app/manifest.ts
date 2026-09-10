import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MIMO — Regalos para hacerle el día a alguien",
    short_name: "MIMO",
    description:
      "Marketplace salvadoreño de flores, regalos, detalles y experiencias. Decime qué querés transmitir y encontramos el detalle.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#cf3452",
    lang: "es-SV",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Ayúdame a elegir",
        short_name: "Elegir regalo",
        description: "El asistente de IA te ayuda a encontrar el regalo correcto",
        url: "/ayudame-a-elegir",
      },
      {
        name: "Mis pedidos",
        short_name: "Pedidos",
        url: "/mis-pedidos",
      },
    ],
  };
}
