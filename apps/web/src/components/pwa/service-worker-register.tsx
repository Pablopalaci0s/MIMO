"use client";

import { useEffect } from "react";

/**
 * Solo se registra en producción — en `next dev` el service worker cachea
 * agresivamente y termina sirviendo JS viejo después de cada cambio,
 * un dolor de cabeza conocido que no vale la pena para un entorno de
 * desarrollo que ya tiene su propio hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[sw] registro falló:", error);
    });
  }, []);

  return null;
}
