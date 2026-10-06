import { ArrowLeft, Bot, MessageSquareText, Star } from "lucide-react";
import Link from "next/link";
import { supportTicketListQuerySchema } from "@mimo/validation";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { TicketActions } from "@/components/centro-soporte/ticket-actions";
import { PriorityTag, StatusBadge } from "@/components/centro-soporte/ticket-badges";
import { TicketContext } from "@/components/centro-soporte/ticket-context";
import { TicketConversation } from "@/components/centro-soporte/ticket-conversation";
import { TicketFilters } from "@/components/centro-soporte/ticket-filters";
import { ViewSwitcher } from "@/components/centro-soporte/view-switcher";
import { TicketList, buildInboxHref } from "@/components/centro-soporte/ticket-list";
import { SOURCE_LABEL, formatDateTime } from "@/components/centro-soporte/labels";
import { UnauthorizedPanel } from "@/components/centro-soporte/unauthorized-panel";
import { AppError } from "@/lib/errors";
import { resolveSupportStaff } from "@/lib/services/support-access-service";
import { listCategories, listMacros } from "@/lib/services/support-config-service";
import {
  getTicketDetail,
  listSupportStaff,
  listTicketMessages,
  listTickets,
} from "@/lib/services/support-ticket-service";
import { isManager } from "@/lib/support/ticket-rules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SupportCenterPage({ searchParams }: PageProps<"/centro-soporte">) {
  // Cada página verifica por su cuenta: el layout no se vuelve a ejecutar en cada navegación.
  const actor = await resolveSupportStaff();
  if (!actor) return <UnauthorizedPanel />;
  const manager = isManager(actor);

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const cleaned = Object.fromEntries(Object.entries(flat).filter(([key, value]) => key !== "t" && value !== undefined && value !== ""));
  const parsed = supportTicketListQuerySchema.safeParse({ view: "sin_asignar", ...cleaned });
  const query = parsed.success ? parsed.data : supportTicketListQuerySchema.parse({ view: "sin_asignar" });
  const selectedId = flat.t && UUID.test(flat.t) ? flat.t : null;

  // Parámetros que se conservan al cambiar de ticket o de página (todo menos el ticket elegido).
  const params: Record<string, string | undefined> = { ...cleaned, view: query.view };

  const [list, categories, macros, staff] = await Promise.all([
    listTickets(actor, query),
    listCategories(),
    listMacros(),
    manager ? listSupportStaff() : Promise.resolve([]),
  ]);

  let detail = null;
  let messages = null;
  let detailProblem: string | null = null;
  if (selectedId) {
    try {
      [detail, messages] = await Promise.all([getTicketDetail(actor, selectedId), listTicketMessages(actor, selectedId)]);
    } catch (error) {
      if (error instanceof AppError && error.status === 404) detailProblem = "No encontramos ese ticket, o no tenés acceso a él.";
      else throw error;
    }
  }

  const permissions = detail?.permissions;
  const composerNotice = !detail
    ? null
    : detail.ticket.status === "CLOSED"
      ? "El ticket está cerrado. Un supervisor puede reabrirlo."
      : detail.ticket.status === "RESOLVED"
        ? "El ticket está resuelto. Reabrilo para volver a escribirle al cliente."
        : detail.ticket.assignedAgentId === null
          ? "Tomá el ticket para poder responder."
          : "No podés escribir en este ticket.";

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-6.5rem)] lg:grid-cols-[23rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)_22rem]">
      <AutoRefresh intervalMs={20_000} />

      {/* Bandeja */}
      <section aria-label="Bandeja de tickets" className={`min-h-0 flex-col gap-3 lg:flex lg:overflow-y-auto lg:pr-1 ${selectedId ? "hidden" : "flex"}`}>
        <div className="flex items-center justify-between gap-2">
          <ViewSwitcher active={query.view} counts={list.counts} isManager={manager} />
          <p className="shrink-0 text-xs text-neutral-500">
            {list.total} {list.total === 1 ? "ticket" : "tickets"}
          </p>
        </div>
        <TicketFilters values={{ ...params }} categories={categories} staff={staff} isManager={manager} />
        <TicketList list={list} selectedId={selectedId} params={params} />
      </section>

      {/* Conversación */}
      {detail && messages && permissions ? (
        <>
          <section
            aria-label="Conversación"
            className="flex min-h-[70vh] min-w-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white lg:min-h-0 dark:bg-neutral-100"
          >
            <header className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4">
              <Link href={buildInboxHref(params, { t: undefined })} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 lg:hidden">
                <ArrowLeft className="size-3.5" /> Volver a la bandeja
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-50">{detail.ticket.code}</span>
                <StatusBadge status={detail.ticket.status} />
                <PriorityTag priority={detail.ticket.priority} />
                {detail.ticket.escalatedFromBot && (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                    <Bot className="size-3.5" /> Escalado por el asistente
                  </span>
                )}
                {detail.ticket.reopenCount > 0 && (
                  <span className="rounded border border-amber-300 px-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Reabierto {detail.ticket.reopenCount} {detail.ticket.reopenCount === 1 ? "vez" : "veces"}
                  </span>
                )}
              </div>
              <h2 className="text-lg leading-snug font-semibold tracking-tight text-neutral-900">{detail.ticket.subject}</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                {[
                  ["Cliente", detail.customer.name],
                  ["Categoría", detail.ticket.categoryName],
                  ["Canal", SOURCE_LABEL[detail.ticket.source]],
                  ["Creado", formatDateTime(detail.ticket.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">{label}</dt>
                    <dd className="mt-0.5 truncate font-medium text-neutral-800" title={value}>
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">A cargo de</dt>
                  <dd className="mt-0.5 truncate font-medium text-neutral-800">{detail.ticket.assignedAgentName ?? "Sin asignar"}</dd>
                </div>
              </dl>
              {(detail.ticket.escalationReason || detail.ticket.summary) && (
                <details className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600" open={detail.ticket.status === "NEW"}>
                  <summary className="cursor-pointer font-medium text-neutral-700 select-none">Contexto de la escalada</summary>
                  {detail.ticket.escalationReason && (
                    <p className="mt-1.5">
                      <strong>Motivo:</strong> {detail.ticket.escalationReason}
                    </p>
                  )}
                  {detail.ticket.summary && <p className="mt-1 whitespace-pre-line">{detail.ticket.summary}</p>}
                </details>
              )}
              {detail.ticket.rating !== null && (
                <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-neutral-700 dark:bg-amber-500/10">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  El cliente calificó la atención con <strong>{detail.ticket.rating}/5</strong>
                  {detail.ticket.ratingComment && <span className="text-neutral-500"> — «{detail.ticket.ratingComment}»</span>}
                </p>
              )}
            </header>

            <TicketConversation
              key={detail.ticket.id}
              ticketId={detail.ticket.id}
              ticketCode={detail.ticket.code}
              customerFirstName={detail.customer.name.split(" ")[0] ?? detail.customer.name}
              customerName={detail.customer.name}
              initial={messages}
              macros={macros}
              canReply={permissions.canReply}
              canNote={permissions.canNote}
              composerNotice={composerNotice}
            />
          </section>

          {/* Acciones + ficha del cliente */}
          <aside
            aria-label="Acciones y contexto"
            className="flex min-h-0 flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-4 lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:overflow-y-auto dark:bg-neutral-100"
          >
            <TicketActions
              key={`${detail.ticket.id}-${detail.ticket.status}-${detail.ticket.assignedAgentId}`}
              ticketId={detail.ticket.id}
              status={detail.ticket.status}
              priority={detail.ticket.priority}
              categoryId={detail.ticket.categoryId}
              assignedAgentId={detail.ticket.assignedAgentId}
              orderNumber={detail.ticket.orderNumber}
              hasBusiness={detail.business !== null}
              permissions={permissions}
              categories={categories}
            />
            <TicketContext detail={detail} />
          </aside>
        </>
      ) : (
        <section
          aria-label="Conversación"
          className={`min-h-[40vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-6 text-center lg:flex xl:col-span-2 ${selectedId ? "flex" : "hidden"}`}
        >
          <MessageSquareText className="size-7 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-700">{detailProblem ?? "Elegí un ticket de la bandeja"}</p>
          <p className="text-xs text-neutral-400">
            {detailProblem ? "Volvé a la bandeja y elegí otro." : "Acá vas a ver la conversación, los datos del cliente y su pedido."}
          </p>
        </section>
      )}
    </div>
  );
}
