"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-pide los datos del Server Component cada tanto (no hay websockets en
 * este stack) — solo con la pestaña visible, y sin tocar lo que alguien
 * esté escribiendo en un formulario cliente de la misma página. */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
