"use client";

import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import type { OrderMessageDTO, OrderMessageSender } from "@mimo/types";

/**
 * Un mismo componente para las dos puntas de la conversación (cliente en
 * `/pedidos/[orderNumber]`, negocio en `OrderItemCard`) — `viewerRole` es lo
 * único que cambia entre uno y otro (para alinear los mensajes propios a la
 * derecha). La API ya valida del lado del servidor que quien pregunta sea
 * el comprador de ese pedido o parte del negocio — acá solo se confía en
 * eso, no hay lógica de permisos en el cliente.
 */
export function OrderMessages({
  orderNumber,
  businessId,
  viewerRole,
}: {
  orderNumber: string;
  businessId: string;
  viewerRole: OrderMessageSender;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<OrderMessageDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || messages !== null) return;

    async function load() {
      const response = await fetch(`/api/orders/${orderNumber}/messages?businessId=${businessId}`);
      const body = await response.json();
      if (body.success) setMessages(body.data);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);

    const response = await fetch(`/api/orders/${orderNumber}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, body: draft.trim() }),
    });
    const body = await response.json();
    setSending(false);

    if (!body.success) {
      setError("No pudimos mandar el mensaje. Probá de nuevo.");
      return;
    }
    setMessages((current) => [...(current ?? []), body.data]);
    setDraft("");
  }

  return (
    <div className="rounded-xl border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <MessageCircle className="size-4 text-neutral-400" />
        Mensajes{messages && messages.length > 0 ? ` (${messages.length})` : ""}
      </button>

      {open && (
        <div className="border-t border-neutral-200 p-3">
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {messages === null ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-neutral-400" />
              </div>
            ) : messages.length === 0 ? (
              <p className="py-2 text-center text-xs text-neutral-400">
                Todavía no hay mensajes en este pedido.
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.senderRole === viewerRole;
                return (
                  <div
                    key={message.id}
                    className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        isMine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800",
                      )}
                    >
                      {message.body}
                    </div>
                    <span className="px-1 text-[11px] text-neutral-400">
                      {message.senderName} ·{" "}
                      {new Date(message.createdAt).toLocaleTimeString("es-SV", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribí un mensaje..."
              maxLength={1000}
              className="h-9 min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-3.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Enviar mensaje"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform disabled:opacity-40"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
