"use client";

import { Download, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "mimo-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Solo aparece cuando el navegador realmente dispara `beforeinstallprompt`
 * (Chrome/Edge/Android) — no hay forma de detectar instalabilidad en Safari
 * (iOS no soporta este evento), así que ahí simplemente no se muestra nada
 * en vez de fingir un botón que no puede funcionar.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // localStorage puede fallar (modo privado) — no mostrar el prompt.
      dismissed = true;
    }
    if (dismissed) return;

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function handleInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // sin persistencia, vuelve a aparecer la próxima visita — no es grave.
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)] sm:right-4 sm:bottom-4 sm:left-auto">
      <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">Instalá MIMO</p>
        <p className="text-xs text-neutral-500">Accedé más rápido desde tu pantalla de inicio.</p>
      </div>
      <button
        onClick={handleInstall}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-700"
      >
        <Download className="size-3.5" />
        Instalar
      </button>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
