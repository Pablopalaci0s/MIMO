import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { SupportConversationActions } from "@/components/admin/support-conversation-actions";
import { AppError } from "@/lib/errors";
import { getAdminSupportConversation } from "@/lib/services/support-service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL = {
  BOT: "Atendida por el asistente",
  WAITING_AGENT: "Esperando respuesta",
  WITH_AGENT: "En curso",
  RESOLVED: "Resuelta",
} as const;

const ROLE_LABEL = { USER: "Cliente", BOT: "Asistente", AGENT: "Equipo" } as const;

export default async function AdminSupportConversationPage({ params }: PageProps<"/admin/soporte/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const conversation = await getAdminSupportConversation(id).catch((error) => {
    if (error instanceof AppError && error.status === 404) return null;
    throw error;
  });
  if (!conversation) notFound();

  return (
    <div className="flex flex-col gap-6">
      {conversation.status !== "RESOLVED" && <AutoRefresh intervalMs={10000} />}

      <div className="flex flex-col gap-3">
        <Link href="/admin/soporte" className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="size-4" />
          Soporte
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{conversation.customerName}</h1>
          {conversation.isGuest && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">Visitante sin cuenta</span>
          )}
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
            {STATUS_LABEL[conversation.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
          {conversation.customerEmail && (
            <a href={`mailto:${conversation.customerEmail}`} className="flex items-center gap-1.5 hover:text-neutral-900">
              <Mail className="size-3.5" />
              {conversation.customerEmail}
            </a>
          )}
          {conversation.assignedToName && <span>Atiende: {conversation.assignedToName}</span>}
          {conversation.rating !== null && <span>Calificación: {conversation.rating}/5</span>}
        </div>
      </div>

      {(conversation.summary || conversation.escalationReason) && (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Resumen para quien atiende</h2>
          {conversation.escalationReason && (
            <p className="mt-2 text-sm text-neutral-900">
              <span className="font-medium">Motivo:</span> {conversation.escalationReason}
            </p>
          )}
          {conversation.summary && (
            <p className="mt-1.5 text-sm whitespace-pre-line text-neutral-600">{conversation.summary}</p>
          )}
        </section>
      )}

      <section aria-label="Conversación" className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
        {conversation.messages.map((message) => {
          const fromTeam = message.role === "AGENT";
          return (
            <div key={message.id} className={cn("flex flex-col gap-1", fromTeam ? "items-end" : "items-start")}>
              <span className="px-1 text-[11px] font-medium text-neutral-400">
                {message.role === "AGENT" ? `${message.authorName ?? "Equipo"} · Equipo` : ROLE_LABEL[message.role]} ·{" "}
                {new Date(message.createdAt).toLocaleString("es-SV", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "USER" && "bg-neutral-900 text-neutral-50",
                  message.role === "BOT" && "bg-neutral-100 text-neutral-700",
                  message.role === "AGENT" && "border border-neutral-200 bg-white text-neutral-900 dark:bg-neutral-50",
                )}
              >
                {message.body}
              </div>
              {message.metadata?.order && (
                <span className="px-1 text-[11px] text-neutral-400">
                  El asistente consultó el pedido {message.metadata.order.orderNumber}
                </span>
              )}
            </div>
          );
        })}
      </section>

      <SupportConversationActions conversationId={conversation.id} status={conversation.status} />
    </div>
  );
}
