"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "mimo-aviso-cookies-ia";

/**
 * Aviso informativo, no un gestor de consentimiento granular: MIMO solo usa
 * una cookie de sesión (necesaria, no de rastreo/publicidad) y no hay nada
 * que "aceptar o rechazar" por separado — ver Política de privacidad. Se
 * guarda en localStorage, no en una cookie, para no depender de lo mismo
 * que el aviso anuncia.
 */
export function CookieAiNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function checkDismissed() {
      let dismissed = false;
      try {
        dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
      } catch {
        dismissed = true;
      }
      setVisible(!dismissed);
    }
    checkDismissed();
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // sin persistencia, vuelve a aparecer la próxima visita — no es grave.
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-36 z-50 mx-auto flex max-w-sm flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:bg-neutral-100 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)] sm:right-auto sm:bottom-4 sm:left-4 sm:mx-0">
      <p className="text-xs leading-relaxed text-neutral-600">
        Usamos una <strong className="text-neutral-900">cookie de sesión</strong> para mantenerte
        conectado/a, y funciones de <strong className="text-neutral-900">inteligencia artificial</strong>{" "}
        (como &quot;Ayúdame a elegir&quot;) para sugerirte regalos. Más detalle en nuestra{" "}
        <Link href="/privacidad" className="underline hover:text-neutral-900">
          Política de privacidad
        </Link>
        .
      </p>
      <Button size="sm" onClick={dismiss} className="w-fit">
        Entendido
      </Button>
    </div>
  );
}
