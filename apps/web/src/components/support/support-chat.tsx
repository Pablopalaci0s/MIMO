"use client";

import {
  CheckCircle2,
  Clock,
  LifeBuoy,
  Loader2,
  Maximize2,
  MoreVertical,
  PlusCircle,
  Send,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "cn";
import type { SupportConversationDTO } from "@mimo/types";
import { MimoMark } from "@/components/brand/mimo-mark";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";
import {
  CONVERSATION_STORAGE_KEY,
  LAST_SEEN_STORAGE_KEY,
  readStorage,
  writeStorage,
} from "./support-events";
import { SupportMessageBubble, TypingIndicator } from "./support-messages";

const POLL_INTERVAL_MS = 5000;
const MAX_MESSAGE_CHARS = 1000;

const WELCOME_SUGGESTIONS = [
  "¿Cómo hago un pedido?",
  "Estado de mi pedido",
  "¿Qué métodos de pago aceptan?",
  "Ayudame a elegir un regalo",
];

type View = "chat" | "confirm" | "contact";

interface SupportChatProps {
  variant: "widget" | "page";
  isLoggedIn: boolean;
  userName: string | null;
  /** Conversación a abrir (ej. el link del correo que le llega a un visitante). */
  initialConversationId?: string;
  onClose?: () => void;
  /** Se llama al tocar un link dentro del chat (el widget se cierra para dejar ver la página). */
  onNavigate?: () => void;
}

const fieldClass =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-base outline-none placeholder:text-neutral-400 focus:border-neutral-300 sm:text-sm dark:bg-neutral-50";

export function SupportChat({
  variant,
  isLoggedIn,
  userName,
  initialConversationId,
  onClose,
  onNavigate,
}: SupportChatProps) {
  const [conversation, setConversation] = useState<SupportConversationDTO | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [escalating, setEscalating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", reason: "" });
  const [dismissedContactFor, setDismissedContactFor] = useState<string | null>(null);
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const status = conversation?.status;
  const conversationId = conversation?.id;
  const messages = conversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  function applyConversation(next: SupportConversationDTO | null) {
    setConversation(next);
    writeStorage(CONVERSATION_STORAGE_KEY, next?.id ?? null);
  }

  // Carga inicial: con cuenta, el servidor sabe cuál es la conversación
  // (sigue entre dispositivos); sin cuenta, se usa el id que guardó el navegador.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const id = initialConversationId ?? readStorage(CONVERSATION_STORAGE_KEY);
      try {
        const response = await fetch(`/api/soporte/conversacion${id ? `?id=${encodeURIComponent(id)}` : ""}`);
        const body = await response.json();
        if (cancelled) return;
        if (body.success) {
          setConversation(body.data.conversation);
          writeStorage(CONVERSATION_STORAGE_KEY, body.data.conversation?.id ?? null);
        }
      } catch {
        /* sin red: arranca vacío, se puede escribir igual */
      }
      if (!cancelled) setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialConversationId]);

  // Mientras la conversación está con una persona del equipo, se consulta cada
  // pocos segundos (no hay websockets en este stack) — solo con la pestaña visible.
  useEffect(() => {
    if (!conversationId || (status !== "WAITING_AGENT" && status !== "WITH_AGENT")) return;

    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/soporte/conversacion?id=${encodeURIComponent(conversationId)}`);
        const body = await response.json();
        const next: SupportConversationDTO | null = body.success ? body.data.conversation : null;
        if (!next) return;
        setConversation((current) =>
          current &&
          current.messages.length === next.messages.length &&
          current.status === next.status &&
          current.canRate === next.canRate
            ? current
            : next,
        );
      } catch {
        /* se reintenta en el próximo ciclo */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [conversationId, status]);

  // Todo lo que está en pantalla ya fue visto: el punto de "mensaje nuevo" del botón se apaga.
  const lastMessageAt = lastMessage?.createdAt;
  useEffect(() => {
    if (lastMessageAt) writeStorage(LAST_SEEN_STORAGE_KEY, lastMessageAt);
  }, [lastMessageAt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending, view, status]);

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setPendingText(text);
    setDraft("");
    setView("chat");

    try {
      const response = await fetch("/api/soporte/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, pagePath: window.location.pathname }),
      });
      const body = await response.json();
      if (!body.success) {
        setError(apiErrorMessage(body, "No pudimos enviar tu mensaje. Probá de nuevo."));
        setDraft(text);
        return;
      }
      applyConversation(body.data.conversation);
    } catch {
      setError("No pudimos enviar tu mensaje. Revisá tu conexión y probá de nuevo.");
      setDraft(text);
    } finally {
      setSending(false);
      setPendingText(null);
    }
  }

  async function escalate(extra: { reason?: string; guestName?: string; guestEmail?: string } = {}) {
    setError(null);
    setEscalating(true);
    try {
      const response = await fetch("/api/soporte/escalar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, ...extra }),
      });
      const body = await response.json();
      if (!body.success) {
        if (body.error?.code === "CONTACT_REQUIRED") {
          setView("contact");
        } else {
          setError(apiErrorMessage(body, "No pudimos pasarte con soporte. Probá de nuevo."));
        }
        return;
      }
      applyConversation(body.data.conversation);
      setView("chat");
      setContact({ name: "", email: "", reason: "" });
    } catch {
      setError("No pudimos pasarte con soporte. Revisá tu conexión y probá de nuevo.");
    } finally {
      setEscalating(false);
    }
  }

  function startEscalation() {
    setMenuOpen(false);
    setError(null);
    setView(isLoggedIn ? "confirm" : "contact");
  }

  async function newConversation() {
    setMenuOpen(false);
    setError(null);
    if (conversation && conversation.status === "BOT") {
      await fetch("/api/soporte/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      }).catch(() => null);
    }
    applyConversation(null);
    setView("chat");
    setRated(false);
    setDraft("");
  }

  async function rate(rating: number) {
    if (!conversation) return;
    setRated(true);
    const response = await fetch("/api/soporte/calificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, rating }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    if (body?.success) {
      setConversation((current) => (current ? { ...current, canRate: false, rating } : current));
    } else {
      setRated(false);
      setError(apiErrorMessage(body, "No pudimos guardar tu calificación."));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  async function handleContactSubmit(event: FormEvent) {
    event.preventDefault();
    await escalate({
      reason: contact.reason.trim() || undefined,
      guestName: contact.name.trim(),
      guestEmail: contact.email.trim(),
    });
  }

  // Si el bot pidió pasar a una persona y es un visitante sin cuenta, falta
  // el contacto: se muestra el formulario hasta que lo mande o lo descarte.
  const botAskedForContact =
    !isLoggedIn &&
    status === "BOT" &&
    lastMessage?.role === "BOT" &&
    lastMessage.metadata?.requestContact === true &&
    lastMessage.id !== dismissedContactFor;
  const activeView: View = view === "chat" && botAskedForContact ? "contact" : view;

  const withHuman = status === "WAITING_AGENT" || status === "WITH_AGENT";
  const title = withHuman ? "Soporte MIMO" : "Asistente MIMO";
  const subtitle =
    status === "WAITING_AGENT"
      ? "Esperando a una persona del equipo"
      : status === "WITH_AGENT"
        ? "Hablando con el equipo de soporte"
        : status === "RESOLVED"
          ? "Conversación finalizada"
          : "Asistente virtual · responde al instante";

  const showWelcome = loaded && messages.length === 0 && !pendingText;
  const firstName = userName?.trim().split(/\s+/)[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          {withHuman ? <LifeBuoy className="size-4 text-neutral-700" /> : <MimoMark className="size-4 text-[#f98079]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{title}</p>
          <p className="truncate text-xs text-neutral-500">{subtitle}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Más opciones"
            aria-expanded={menuOpen}
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-9 right-0 z-20 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:bg-neutral-100">
                {(!conversation || status === "BOT") && (
                  <button
                    type="button"
                    onClick={startEscalation}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <LifeBuoy className="size-4 text-neutral-400" />
                    Hablar con una persona
                  </button>
                )}
                {conversation && (status === "BOT" || status === "RESOLVED") && (
                  <button
                    type="button"
                    onClick={() => void newConversation()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <PlusCircle className="size-4 text-neutral-400" />
                    Nueva conversación
                  </button>
                )}
                {variant === "widget" && (
                  <Link
                    href="/soporte"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    <Maximize2 className="size-4 text-neutral-400" />
                    Abrir en pantalla completa
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {variant === "widget" && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el chat"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        )}
      </header>

      {status === "WAITING_AGENT" && (
        <div className="flex items-start gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-600">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
          <span>
            Tu consulta ya está con el equipo de soporte. Te respondemos acá mismo y te avisamos cuando haya novedades —
            podés cerrar el chat y volver más tarde.
          </span>
        </div>
      )}

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversación de soporte"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {!loaded && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-neutral-400" />
          </div>
        )}

        {showWelcome && (
          <div className="flex flex-col items-start gap-2">
            <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-neutral-500">
              <MimoMark className="size-3 text-[#f98079]" />
              Asistente virtual
            </span>
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 text-sm leading-relaxed text-neutral-800">
              ¡Hola{firstName ? `, ${firstName}` : ""}! Soy el asistente virtual de MIMO. Te ayudo con pedidos, pagos,
              entregas, tu cuenta y a encontrar regalos. Si hace falta, te paso con una persona del equipo.
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {WELCOME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <SupportMessageBubble
            key={message.id}
            message={message}
            showSuggestions={status === "BOT" && message.id === lastMessage?.id && !sending}
            onSuggestion={(text) => void send(text)}
            onNavigate={onNavigate}
          />
        ))}

        {pendingText && (
          <div className="flex flex-col items-end gap-1">
            <div className="max-w-[88%] rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap text-neutral-50">
              {pendingText}
            </div>
          </div>
        )}
        {sending && (status === undefined || status === "BOT") && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-200 px-4 py-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {status === "RESOLVED" ? (
          <div className="flex flex-col items-center gap-3 py-1 text-center">
            {conversation?.canRate && !rated ? (
              <>
                <p className="text-sm text-neutral-700">¿Cómo fue la atención?</p>
                <div className="flex gap-1" role="group" aria-label="Calificá la atención de 1 a 5 estrellas">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void rate(value)}
                      aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                      className="rounded-full p-1.5 text-neutral-300 transition-colors hover:text-amber-400"
                    >
                      <Star className="size-6" fill="currentColor" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-neutral-600">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {conversation?.rating || rated ? "¡Gracias por tu opinión!" : "Esta conversación terminó."}
              </p>
            )}
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void newConversation()}>
              <PlusCircle className="size-4" />
              Empezar una conversación nueva
            </Button>
          </div>
        ) : activeView === "confirm" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3">
            <p className="text-sm text-neutral-800">
              ¿Querés que te pase con una persona del equipo de soporte? Va a recibir esta conversación con un resumen,
              así no tenés que repetir nada.
            </p>
            <input
              value={contact.reason}
              onChange={(event) => setContact((current) => ({ ...current, reason: event.target.value }))}
              maxLength={500}
              placeholder="Contanos en una línea qué necesitás (opcional)"
              aria-label="Motivo de la consulta (opcional)"
              className={fieldClass}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-full"
                disabled={escalating}
                onClick={() => void escalate({ reason: contact.reason.trim() || undefined })}
              >
                {escalating ? <Loader2 className="size-4 animate-spin" /> : "Sí, pasame con una persona"}
              </Button>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setView("chat")}>
                Seguir acá
              </Button>
            </div>
          </div>
        ) : activeView === "contact" ? (
          <form onSubmit={handleContactSubmit} className="flex flex-col gap-2.5 rounded-xl border border-neutral-200 p-3">
            <p className="text-sm text-neutral-800">
              Dejanos cómo contactarte y te pasamos con una persona del equipo. Usamos tu correo solo para responderte
              esta consulta.
            </p>
            <input
              required
              value={contact.name}
              onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
              maxLength={80}
              placeholder="Tu nombre"
              aria-label="Tu nombre"
              autoComplete="name"
              className={fieldClass}
            />
            <input
              required
              type="email"
              value={contact.email}
              onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
              maxLength={120}
              placeholder="Tu correo"
              aria-label="Tu correo"
              autoComplete="email"
              className={fieldClass}
            />
            {!botAskedForContact && (
              <input
                value={contact.reason}
                onChange={(event) => setContact((current) => ({ ...current, reason: event.target.value }))}
                maxLength={500}
                placeholder="¿Qué necesitás? (opcional)"
                aria-label="Motivo de la consulta (opcional)"
                className={fieldClass}
              />
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 rounded-full" disabled={escalating}>
                {escalating ? <Loader2 className="size-4 animate-spin" /> : "Enviar a soporte"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  if (botAskedForContact && lastMessage) setDismissedContactFor(lastMessage.id);
                  setView("chat");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_CHARS}
                disabled={!loaded || sending}
                placeholder={withHuman ? "Escribile al equipo de soporte…" : "Escribí tu consulta…"}
                aria-label="Tu mensaje"
                className="max-h-28 min-h-10 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-base outline-none [field-sizing:content] placeholder:text-neutral-400 focus:border-neutral-300 disabled:opacity-60 sm:text-sm dark:bg-neutral-50"
              />
              <button
                type="submit"
                disabled={!loaded || sending || !draft.trim()}
                aria-label="Enviar mensaje"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 transition-opacity",
                  "disabled:opacity-40",
                )}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
            {(!conversation || status === "BOT") && (
              <button
                type="button"
                onClick={startEscalation}
                className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
              >
                <LifeBuoy className="size-3.5" />
                ¿Preferís hablar con una persona? Hablar con soporte
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
