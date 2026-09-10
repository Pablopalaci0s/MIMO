import type { Metadata, Viewport } from "next";

// Compartido por los dos root layout (`(site)` y `(dashboard)`, ver el
// gotcha de Next.js 16 con múltiples root layouts en CLAUDE.md) para que el
// tema/ícono/manifest no se dupliquen a mano en cada uno.
export const pwaViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#cf3452",
};

export const pwaMetadata: Metadata = {
  manifest: "/manifest.webmanifest",
  // Evita que iOS/Android conviertan números de pedido (MIMO-2026...) o
  // precios en links de teléfono/email por accidente — los tel: reales
  // (botón de llamar al negocio) ya están armados a mano donde corresponde.
  formatDetection: { telephone: false, email: false, address: false },
  // Next 16 ya emite el meta "mobile-web-app-capable" (sin el viejo
  // prefijo "apple-") a partir de `capable: true` — verificado a mano
  // porque el comportamiento cambió respecto a versiones anteriores de
  // Next (ver apps/web/AGENTS.md). Agregarlo de nuevo en `other` duplicaba
  // el meta tag.
  appleWebApp: {
    capable: true,
    title: "MIMO",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};
