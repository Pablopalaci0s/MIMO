"use client";

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BusinessOrderItemDTO } from "@mimo/types";

const POLL_INTERVAL_MS = 15000;
const TOAST_AUTO_DISMISS_MS = 10000;

/** "Ding-dong" simple con Web Audio — sin depender de un archivo de audio
 * (evita tener que empaquetar/licenciar un sonido). Si el navegador bloquea
 * autoplay (sin interacción previa del usuario en la página), falla en
 * silencio: el aviso visual igual aparece. */
function playAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    function tone(freq: number, start: number, duration: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    }

    tone(880, 0, 0.15);
    tone(1174.66, 0.18, 0.22);
  } catch {
    // Web Audio no disponible/bloqueado — no es crítico.
  }
}

/**
 * Vive en el layout de `/negocio` (todas las páginas del panel, no solo
 * pedidos) — sondea pedidos pendientes cada `POLL_INTERVAL_MS` y, si aparece
 * uno nuevo desde la última vuelta, suena una alerta y muestra un aviso
 * flotante con link directo, sin recargar la página. `router.refresh()`
 * además refresca los datos del Server Component actual (si están viendo
 * `/negocio/pedidos`, la lista se actualiza sola).
 *
 * No es realtime de verdad (WebSockets/SSE) — es polling simple, a
 * propósito: no hay infraestructura de tiempo real en este proyecto y
 * agregarla para esto sería sobre-ingeniería. 15s es un compromiso
 * razonable entre "casi al instante" y no perforar el servidor a pedidos.
 */
export function NewOrderWatcher() {
  const router = useRouter();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [toastItem, setToastItem] = useState<BusinessOrderItemDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    let dismissTimeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch("/api/negocio/pedidos?status=PENDING");
        const body = await response.json();
        if (cancelled || !body.success) return;

        const items = body.data as BusinessOrderItemDTO[];
        const currentIds = new Set(items.map((item) => item.id));

        if (seenIdsRef.current === null) {
          // Primera carga: solo establece la base, no alerta por pedidos
          // que ya estaban pendientes antes de abrir el panel.
          seenIdsRef.current = currentIds;
          return;
        }

        const newest = items.find((item) => !seenIdsRef.current!.has(item.id));
        seenIdsRef.current = currentIds;

        if (newest) {
          playAlertSound();
          setToastItem(newest);
          router.refresh();
          clearTimeout(dismissTimeout);
          dismissTimeout = setTimeout(() => setToastItem(null), TOAST_AUTO_DISMISS_MS);
        }
      } catch {
        // Un poll fallido no debería mostrar error — el próximo intento lo resuelve solo.
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(dismissTimeout);
    };
  }, [router]);

  if (!toastItem) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.25)] sm:right-4 sm:left-auto">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Bell className="size-4" />
      </span>
      <Link href="/negocio/pedidos" className="min-w-0 flex-1" onClick={() => setToastItem(null)}>
        <p className="text-sm font-semibold text-neutral-900">Nuevo pedido — #{toastItem.orderNumber}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {toastItem.quantity}× {toastItem.productName} · {toastItem.recipientName}
        </p>
      </Link>
      <button
        onClick={() => setToastItem(null)}
        aria-label="Cerrar"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
