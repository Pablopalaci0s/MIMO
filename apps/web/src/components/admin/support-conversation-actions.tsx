"use client";

import { CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { SupportConversationStatus } from "@mimo/types";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error-message";

/** Responder, resolver y reabrir una conversación de soporte. La API valida
 * del lado del servidor que quien llama sea ADMIN — acá no hay permisos. */
export function SupportConversationActions({
  conversationId,
  status,
}: {
  conversationId: string;
  status: SupportConversationStatus;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"reply" | "resolve" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(kind: "reply" | "resolve" | "reopen", url: string, init: RequestInit, onSuccess?: () => void) {
    setBusy(kind);
    setError(null);
    try {
      const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const body = await response.json();
      if (!body.success) {
        setError(apiErrorMessage(body, "No se pudo completar la acción."));
        return;
      }
      onSuccess?.();
      router.refresh();
    } catch {
      setError("No se pudo completar la acción. Revisá tu conexión.");
    } finally {
      setBusy(null);
    }
  }

  function reply(event?: FormEvent) {
    event?.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    void call(
      "reply",
      `/api/admin/soporte/${conversationId}/responder`,
      { method: "POST", body: JSON.stringify({ message: text }) },
      () => setMessage(""),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      reply();
    }
  }

  if (status === "BOT") {
    return (
      <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
        Esta conversación todavía la atiende el asistente — la persona no pidió hablar con el equipo. Es solo lectura.
      </p>
    );
  }

  if (status === "RESOLVED") {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          variant="outline"
          className="w-fit rounded-full"
          disabled={busy !== null}
          onClick={() =>
            void call("reopen", `/api/admin/soporte/${conversationId}`, {
              method: "PATCH",
              body: JSON.stringify({ action: "reopen" }),
            })
          }
        >
          {busy === "reopen" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Reabrir conversación
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={reply} className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          maxLength={2000}
          placeholder="Escribí tu respuesta — la persona la ve en su chat y le llega una notificación (o un correo, si es visitante)."
          aria-label="Respuesta para el cliente"
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:bg-neutral-50"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className="rounded-full" disabled={busy !== null || !message.trim()}>
            {busy === "reply" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar respuesta
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy !== null}
            onClick={() =>
              void call("resolve", `/api/admin/soporte/${conversationId}`, {
                method: "PATCH",
                body: JSON.stringify({ action: "resolve" }),
              })
            }
          >
            {busy === "resolve" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Marcar como resuelta
          </Button>
          <span className="text-xs text-neutral-400">Ctrl/⌘ + Enter para enviar</span>
        </div>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
