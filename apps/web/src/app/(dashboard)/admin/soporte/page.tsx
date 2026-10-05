import { Star } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import type { SupportConversationStatus } from "@mimo/types";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { listAdminSupportConversations, type AdminSupportFilter } from "@/lib/services/support-service";

const FILTERS: { value: AdminSupportFilter; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "resolved", label: "Resueltas" },
  { value: "bot", label: "Solo asistente" },
  { value: "all", label: "Todas" },
];

const STATUS_LABEL: Record<SupportConversationStatus, string> = {
  BOT: "Asistente",
  WAITING_AGENT: "Esperando respuesta",
  WITH_AGENT: "En curso",
  RESOLVED: "Resuelta",
};

const STATUS_STYLE: Record<SupportConversationStatus, string> = {
  BOT: "bg-neutral-100 text-neutral-600",
  WAITING_AGENT: "bg-brand-soft text-brand",
  WITH_AGENT: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
};

function isFilter(value: string | undefined): value is AdminSupportFilter {
  return FILTERS.some((filter) => filter.value === value);
}

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/soporte">) {
  const { estado } = await searchParams;
  const filter: AdminSupportFilter = typeof estado === "string" && isFilter(estado) ? estado : "pending";
  const conversations = await listAdminSupportConversations(filter);
  const waiting = conversations.filter((conversation) => conversation.needsReply).length;

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={15000} />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Soporte</h1>
        <p className="text-sm text-neutral-500">
          {filter === "pending"
            ? waiting > 0
              ? `${waiting} ${waiting === 1 ? "conversación espera" : "conversaciones esperan"} tu respuesta.`
              : "No hay nadie esperando respuesta."
            : `${conversations.length} ${conversations.length === 1 ? "conversación" : "conversaciones"}.`}
        </p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar conversaciones">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={item.value === "pending" ? "/admin/soporte" : `/admin/soporte?estado=${item.value}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              filter === item.value
                ? "border-neutral-900 bg-neutral-900 text-neutral-50"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        {conversations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            No hay conversaciones en esta vista.
          </p>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/admin/soporte/${conversation.id}`}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border px-4 py-3 transition-colors hover:border-neutral-300",
                conversation.needsReply ? "border-brand/30 bg-brand-soft/30" : "border-neutral-200",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{conversation.customerName}</span>
                {conversation.isGuest && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">Visitante</span>
                )}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[conversation.status])}>
                  {STATUS_LABEL[conversation.status]}
                </span>
                {conversation.assignedToName && (
                  <span className="text-xs text-neutral-400">· {conversation.assignedToName}</span>
                )}
                {conversation.rating !== null && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-600">
                    <Star className="size-3" fill="currentColor" />
                    {conversation.rating}
                  </span>
                )}
                <span className="ml-auto text-xs text-neutral-400">
                  {new Date(conversation.lastMessageAt).toLocaleString("es-SV", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-neutral-600">
                {conversation.summary ? conversation.summary.split("\n")[0] : conversation.lastMessagePreview}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
