"use client";

import { Bot, Loader2, Lock, MessageSquareText, Send, ShieldAlert, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";
import type { SupportMacroDTO, SupportTicketMessageDTO, SupportTicketMessagesDTO } from "@mimo/types";
import { initials } from "./charts";

const POLL_INTERVAL_MS = 8000;

interface Props {
  ticketId: string;
  ticketCode: string;
  customerFirstName: string;
  customerName: string;
  initial: SupportTicketMessagesDTO;
  macros: SupportMacroDTO[];
  canReply: boolean;
  canNote: boolean;
  /** Por qué no se puede escribir (ticket resuelto/cerrado, sin dueño…). */
  composerNotice: string | null;
}

function dayLabel(iso: string): string {
  const day = (value: number) => new Date(value - 6 * 3_600_000).toISOString().slice(0, 10);
  const target = day(new Date(iso).getTime());
  if (target === day(Date.now())) return "Hoy";
  if (target === day(Date.now() - 86_400_000)) return "Ayer";
  return new Date(iso).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" });
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span className="h-px flex-1 bg-neutral-200" />
      <span className="text-[11px] font-medium tracking-wide text-neutral-400 capitalize">{dayLabel(iso)}</span>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function MessageBubble({ message, customerName }: { message: SupportTicketMessageDTO; customerName: string }) {
  const internal = message.visibility === "INTERNAL";
  const fromCustomer = message.role === "USER";
  const fromBot = message.role === "BOT";

  if (internal) {
    return (
      <div className="ml-auto w-full max-w-[85%] rounded-md border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800 dark:border-amber-500/40 dark:bg-amber-500/10">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
          <Lock className="size-3" /> Nota interna · el cliente no la ve
        </p>
        {message.body}
        <p className="mt-1.5 text-[11px] text-neutral-500">
          {message.authorName ?? "Equipo"} · {timeOnly(message.createdAt)}
        </p>
      </div>
    );
  }

  const author = fromCustomer ? customerName : fromBot ? "Asistente virtual" : (message.authorName ?? "Equipo de soporte");
  return (
    <div className={cn("flex items-end gap-2.5", !fromCustomer && !fromBot && "flex-row-reverse")}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          fromCustomer && "bg-neutral-200 text-neutral-700",
          fromBot && "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
          !fromCustomer && !fromBot && "bg-sc-primary text-white",
        )}
        aria-hidden
      >
        {fromBot ? <Bot className="size-4" /> : initials(author)}
      </span>
      <div className={cn("flex max-w-[78%] flex-col gap-1", !fromCustomer && !fromBot && "items-end")}>
        <p className="px-0.5 text-[11px] text-neutral-500">
          <span className="font-medium text-neutral-700">{author}</span> · {timeOnly(message.createdAt)}
        </p>
        <div
          className={cn(
            "rounded-lg px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
            fromCustomer && "rounded-bl-sm bg-neutral-100 text-neutral-800",
            fromBot && "rounded-bl-sm border border-neutral-200 bg-white text-neutral-600 dark:bg-neutral-50",
            !fromCustomer && !fromBot && "rounded-br-sm bg-sc-primary text-white",
          )}
        >
          {message.body}
          {message.redacted && (
            <span className="mt-1 flex items-center gap-1 text-[11px] opacity-75">
              <ShieldAlert className="size-3" /> Se ocultó un dato sensible
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TicketConversation({ ticketId, ticketCode, customerFirstName, customerName, initial, macros, canReply, canNote, composerNotice }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<"reply" | "note">(canReply ? "reply" : "note");
  const [body, setBody] = useState("");
  const [waitForCustomer, setWaitForCustomer] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(messages.at(-1)?.createdAt ?? null);

  // Polling moderado: solo con la pestaña visible y pidiendo únicamente lo nuevo.
  useEffect(() => {
    async function poll() {
      if (document.visibilityState !== "visible" || !lastAt.current) return;
      const response = await fetch(`/api/centro-soporte/tickets/${ticketId}/mensajes?after=${encodeURIComponent(lastAt.current)}`).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      const incoming: SupportTicketMessageDTO[] = result?.success ? result.data.items : [];
      if (incoming.length === 0) return;
      setMessages((current) => {
        const known = new Set(current.map((message) => message.id));
        return [...current, ...incoming.filter((message) => !known.has(message.id))];
      });
      lastAt.current = incoming.at(-1)!.createdAt;
      // Algo nuevo del cliente puede haber cambiado el estado del ticket: refresca el resto de la pantalla.
      router.refresh();
    }
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ticketId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function loadOlder() {
    if (!cursor) return;
    setLoadingMore(true);
    const response = await fetch(`/api/centro-soporte/tickets/${ticketId}/mensajes?before=${encodeURIComponent(cursor)}`).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setLoadingMore(false);
    if (!result?.success) {
      setError(apiErrorMessage(result, "No pudimos cargar los mensajes anteriores."));
      return;
    }
    const older: SupportTicketMessageDTO[] = result.data.items;
    setMessages((current) => [...older, ...current]);
    setHasMore(result.data.hasMore);
    setCursor(result.data.nextCursor);
  }

  /** Inserta el texto de una macro en el cuadro; NO envía nada. */
  function insertMacro(macroId: string) {
    const macro = macros.find((candidate) => candidate.id === macroId);
    if (!macro) return;
    const text = macro.body.replaceAll("{cliente}", customerFirstName).replaceAll("{ticket}", ticketCode);
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
    setMode("reply");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/centro-soporte/tickets/${ticketId}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: mode, body, waitForCustomer: mode === "reply" ? waitForCustomer : undefined }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setSending(false);
    if (!result?.success) {
      setError(apiErrorMessage(result, "No pudimos enviar el mensaje."));
      return;
    }
    if (result.data?.redacted) setNotice("Se ocultó un dato sensible (documento o tarjeta) en tu mensaje antes de guardarlo.");
    setBody("");
    setWaitForCustomer(false);

    // Trae lo que acaba de guardarse (y cualquier mensaje intermedio del cliente).
    const fresh = await fetch(`/api/centro-soporte/tickets/${ticketId}/mensajes${lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : ""}`).catch(() => null);
    const freshResult = fresh ? await fresh.json().catch(() => null) : null;
    const incoming: SupportTicketMessageDTO[] = freshResult?.success ? freshResult.data.items : [];
    if (incoming.length > 0) {
      setMessages((current) => {
        const known = new Set(current.map((message) => message.id));
        return [...current, ...incoming.filter((message) => !known.has(message.id))];
      });
      lastAt.current = incoming.at(-1)!.createdAt;
    }
    router.refresh();
  }

  const canWrite = canReply || canNote;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50/60 px-5 py-5" aria-live="polite">
        {hasMore && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadOlder()}>
              {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : "Cargar mensajes anteriores"}
            </Button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">Todavía no hay mensajes en esta conversación.</p>
        )}
        {messages.map((message, index) => (
          <div key={message.id} className="flex flex-col gap-4">
            {(index === 0 || dayLabel(messages[index - 1]!.createdAt) !== dayLabel(message.createdAt)) && <DaySeparator iso={message.createdAt} />}
            <MessageBubble message={message} customerName={customerName} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-200 bg-white dark:bg-neutral-100">
        {!canWrite ? (
          <p className="flex items-center gap-2 px-5 py-4 text-sm text-neutral-500">
            <Lock className="size-4" /> {composerNotice ?? "No podés escribir en este ticket."}
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col">
            <div className="flex items-end justify-between gap-2 border-b border-neutral-200 px-5">
              <div role="tablist" aria-label="Tipo de mensaje" className="flex gap-5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "reply"}
                  disabled={!canReply}
                  onClick={() => setMode("reply")}
                  className={cn(
                    "-mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40",
                    mode === "reply" ? "border-sc-primary text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  <Send className="size-3.5" /> Responder al cliente
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "note"}
                  disabled={!canNote}
                  onClick={() => setMode("note")}
                  className={cn(
                    "-mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40",
                    mode === "note" ? "border-amber-500 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  <Lock className="size-3.5" /> Nota interna
                </button>
              </div>
              {macros.length > 0 && (
                <label className="mb-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
                  <Zap className="size-3.5" />
                  <select
                    value=""
                    onChange={(event) => {
                      insertMacro(event.target.value);
                      event.target.value = "";
                    }}
                    aria-label="Insertar respuesta rápida"
                    className="h-7 max-w-48 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-700 dark:bg-neutral-100"
                  >
                    <option value="">Respuesta rápida…</option>
                    {macros.map((macro) => (
                      <option key={macro.id} value={macro.id}>
                        {macro.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className={cn("flex flex-col gap-2 px-5 py-3", mode === "note" && "bg-amber-50/60 dark:bg-amber-500/5")}>
              {mode === "note" && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <Lock className="size-3" /> Solo la ve el equipo de soporte. Nunca llega al chat del cliente.
                </p>
              )}

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                maxLength={4000}
                placeholder={mode === "note" ? "Escribí una nota para el equipo…" : `Respondele a ${customerFirstName}… (revisá el texto antes de enviar)`}
                aria-label={mode === "note" ? "Nota interna" : "Respuesta al cliente"}
                className={cn(
                  "w-full resize-y rounded-md border bg-white px-3 py-2 text-base outline-none placeholder:text-neutral-400 focus:border-sc-primary focus:ring-2 focus:ring-sc-primary/20 sm:text-sm dark:bg-neutral-50",
                  mode === "note" ? "border-amber-300" : "border-neutral-300",
                )}
              />

              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              {notice && <p className="text-xs text-neutral-500">{notice}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2">
                {mode === "reply" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
                    <input type="checkbox" checked={waitForCustomer} onChange={(event) => setWaitForCustomer(event.target.checked)} className="size-4 accent-sc-primary" />
                    Dejar esperando al cliente después de enviar
                  </label>
                ) : (
                  <span className="text-[11px] text-neutral-400">{body.length}/4000</span>
                )}
                <Button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className={cn("rounded-md bg-sc-primary text-white hover:bg-sc-primary-hover", mode === "note" && "bg-amber-500 hover:bg-amber-600")}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : mode === "note" ? <MessageSquareText className="size-4" /> : <Send className="size-4" />}
                  {mode === "note" ? "Guardar nota" : "Enviar respuesta"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
