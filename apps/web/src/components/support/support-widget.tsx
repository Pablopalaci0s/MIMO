"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SupportChat } from "./support-chat";
import {
  CONVERSATION_STORAGE_KEY,
  LAST_SEEN_STORAGE_KEY,
  OPEN_SUPPORT_CHAT_EVENT,
  readStorage,
} from "./support-events";

const UNREAD_POLL_MS = 45_000;

/**
 * Botón flotante + panel del chat. Va montado en el layout del sitio (no en
 * los paneles de negocio/admin, que tienen su propio layout). En `/soporte`
 * no se muestra: esa página ya es el chat completo.
 */
export function SupportWidget({ isLoggedIn, userName }: { isLoggedIn: boolean; userName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);

  // Cualquier parte de la página puede abrir el chat (ej. el botón de /ayuda).
  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Con el chat cerrado, un aviso discreto si el equipo de soporte respondió.
  // Solo si hay algo que revisar (cuenta, o un id guardado): un visitante que
  // nunca abrió el chat no genera ninguna llamada.
  useEffect(() => {
    if (open) return;
    let cancelled = false;

    async function check() {
      const storedId = readStorage(CONVERSATION_STORAGE_KEY);
      if (!isLoggedIn && !storedId) return;
      try {
        const response = await fetch(`/api/soporte/conversacion${storedId ? `?id=${encodeURIComponent(storedId)}` : ""}`);
        const body = await response.json();
        if (cancelled || !body.success) return;
        const messages = body.data.conversation?.messages ?? [];
        const last = messages[messages.length - 1];
        const lastSeen = readStorage(LAST_SEEN_STORAGE_KEY);
        setUnread(Boolean(last && last.role === "AGENT" && (!lastSeen || last.createdAt > lastSeen)));
      } catch {
        /* sin red: sin aviso */
      }
    }

    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, isLoggedIn]);

  if (pathname.startsWith("/soporte")) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar el chat"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[45] cursor-default bg-black/30 sm:hidden"
        />
      )}

      {open ? (
        <section
          role="dialog"
          aria-label="Chat de ayuda de MIMO"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[640px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-2xl dark:bg-neutral-100"
        >
          <SupportChat
            variant="widget"
            isLoggedIn={isLoggedIn}
            userName={userName}
            onClose={() => setOpen(false)}
            onNavigate={() => setOpen(false)}
          />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread ? "Abrir el chat de ayuda (tenés una respuesta nueva)" : "Abrir el chat de ayuda"}
          className="fixed right-4 bottom-20 z-40 flex size-12 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-5" />
          {unread && (
            <span className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-brand dark:border-neutral-100" />
          )}
        </button>
      )}
    </>
  );
}
