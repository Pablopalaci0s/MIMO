// Service worker de MIMO — alcance deliberadamente chico: cachear el shell
// estático para que la app abra rápido y ofrecer una página de "sin
// conexión" honesta cuando falta red, no simular que el marketplace
// funciona offline (catálogo/checkout necesitan datos reales del servidor;
// sección 5 de las reglas del usuario prohíbe fingir funcionalidad que no
// existe).
//
// Subir CACHE_VERSION cuando cambie esta lista o la estrategia de cacheo,
// para que los clientes viejos limpien su caché en el próximo activate.
const CACHE_VERSION = "v1";
const CACHE_NAME = `mimo-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nunca cachear datos dinámicos

  // Navegación (cargar una página): red primero, para no mostrar contenido
  // viejo de un pedido/carrito — si no hay red, la página de offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Assets estáticos: cache primero (no cambian de contenido con el mismo
  // nombre de archivo — Next les pone hash), con red como respaldo.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
  }
});
