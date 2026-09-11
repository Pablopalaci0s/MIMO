"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Boilerplate estándar de Web Push: la clave VAPID viene en base64url y la
// API del navegador la exige como Uint8Array.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type Status = "checking" | "unsupported" | "denied" | "off" | "on" | "working";

export function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      const response = await fetch("/api/push/vapid-public-key");
      const body = await response.json();
      const publicKey = body.success ? (body.data.publicKey as string | null) : null;
      if (!publicKey) {
        setStatus("unsupported");
        return;
      }
      setVapidPublicKey(publicKey);

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "on" : "off");
    }
    void check();
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setStatus("working");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const body = await response.json();
      if (!body.success) throw new Error("No pudimos activar las notificaciones.");

      setStatus("on");
    } catch {
      setError("No pudimos activar las notificaciones. Probá de nuevo.");
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("working");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("No pudimos desactivar las notificaciones.");
      setStatus("on");
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-3">
        {status === "on" ? (
          <Bell className="size-4 text-brand" />
        ) : (
          <BellOff className="size-4 text-neutral-400" />
        )}
        <div>
          <p className="text-sm font-medium text-neutral-900">Notificaciones push</p>
          <p className="text-xs text-neutral-500">
            {status === "denied"
              ? "Las bloqueaste en el navegador — activalas desde su configuración."
              : status === "on"
                ? "Activadas en este dispositivo."
                : "Avisos de pedidos, reseñas y fechas importantes, aunque no tengas MIMO abierto."}
          </p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
      {status !== "denied" && (
        <Button
          size="sm"
          variant={status === "on" ? "outline" : "default"}
          disabled={status === "working"}
          onClick={status === "on" ? disable : enable}
        >
          {status === "working" ? <Loader2 className="size-3.5 animate-spin" /> : status === "on" ? "Desactivar" : "Activar"}
        </Button>
      )}
    </div>
  );
}
