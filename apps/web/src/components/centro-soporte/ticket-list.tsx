import { Bot, ChevronLeft, ChevronRight, Inbox, Package } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import type { SupportTicketListDTO } from "@mimo/types";
import { initials } from "./charts";
import { PRIORITY_EDGE, timeAgo } from "./labels";
import { PriorityTag, StatusBadge } from "./ticket-badges";

/** Arma una URL de la bandeja conservando los parámetros actuales y cambiando los indicados. */
export function buildInboxHref(current: Record<string, string | undefined>, changes: Record<string, string | undefined>): string {
  const merged = { ...current, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const query = params.toString();
  return query ? `/centro-soporte?${query}` : "/centro-soporte";
}

export function TicketList({
  list,
  selectedId,
  params,
}: {
  list: SupportTicketListDTO;
  selectedId: string | null;
  params: Record<string, string | undefined>;
}) {
  if (list.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Inbox className="size-5" />
        </span>
        <p className="text-sm font-medium text-neutral-800">Cola vacía</p>
        <p className="max-w-52 text-xs text-neutral-500">No hay tickets en esta cola con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:bg-neutral-100">
        {list.items.map((ticket) => {
          const selected = ticket.id === selectedId;
          return (
            <li key={ticket.id}>
              <Link
                href={buildInboxHref(params, { t: ticket.id })}
                aria-current={selected ? "true" : undefined}
                className={cn("relative flex flex-col gap-1 py-2.5 pr-3.5 pl-4 transition-colors", selected ? "bg-sc-primary-soft" : "hover:bg-neutral-50")}
              >
                <span className={cn("absolute inset-y-0 left-0 w-1", PRIORITY_EDGE[ticket.priority])} aria-hidden />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-neutral-800">{ticket.code}</span>
                    <PriorityTag priority={ticket.priority} />
                  </span>
                  <span className={cn("text-[11px] tabular-nums", ticket.needsReply ? "font-medium text-sc-danger" : "text-neutral-400")}>
                    {timeAgo(ticket.updatedAt)}
                  </span>
                </div>
                <p className="line-clamp-1 text-[13px] font-semibold text-neutral-900">{ticket.subject}</p>
                <p className="truncate text-xs text-neutral-500">
                  {ticket.customerName}
                  {ticket.isGuest && " (visitante)"} · {ticket.categoryName}
                </p>
                {ticket.lastMessagePreview && <p className="line-clamp-1 text-xs text-neutral-400">{ticket.lastMessagePreview}</p>}
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  {ticket.needsReply && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sc-danger">
                      <span className="size-1.5 rounded-full bg-sc-danger" aria-hidden /> Espera respuesta
                    </span>
                  )}
                  {ticket.escalatedFromBot && (
                    <span title="Escalado por el asistente" className="text-neutral-400">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  {ticket.orderNumber && (
                    <span title={`Pedido ${ticket.orderNumber}`} className="text-neutral-400">
                      <Package className="size-3.5" />
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-neutral-500">
                    {ticket.assignedAgentName ? (
                      <>
                        <span className="flex size-5 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-semibold text-neutral-700" aria-hidden>
                          {initials(ticket.assignedAgentName)}
                        </span>
                        <span className="max-w-24 truncate">{ticket.assignedAgentName}</span>
                      </>
                    ) : (
                      <span className="rounded border border-dashed border-neutral-300 px-1.5 py-px text-neutral-400">Sin asignar</span>
                    )}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {list.totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-neutral-500">
          <span>
            Página {list.page} de {list.totalPages} · {list.total} tickets
          </span>
          <span className="flex gap-1">
            {list.page > 1 && (
              <Link href={buildInboxHref(params, { page: String(list.page - 1) })} aria-label="Página anterior" className="rounded-md border border-neutral-200 bg-white p-1 hover:bg-neutral-50 dark:bg-neutral-100">
                <ChevronLeft className="size-4" />
              </Link>
            )}
            {list.page < list.totalPages && (
              <Link href={buildInboxHref(params, { page: String(list.page + 1) })} aria-label="Página siguiente" className="rounded-md border border-neutral-200 bg-white p-1 hover:bg-neutral-50 dark:bg-neutral-100">
                <ChevronRight className="size-4" />
              </Link>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
