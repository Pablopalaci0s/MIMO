import { AlertTriangle, Building2, History, Package, User } from "lucide-react";
import Link from "next/link";
import type { SupportTicketDetailDTO } from "@mimo/types";
import { AddressReveal } from "./address-reveal";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
  TIMELINE_LABEL,
  formatDateTime,
  formatMoney,
  timeAgo,
} from "./labels";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-neutral-200 pt-4">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
        <span className="flex size-5 items-center justify-center rounded bg-neutral-100 text-neutral-500">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-neutral-200 pb-1.5 text-[13px] last:border-0 last:pb-0">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 text-right font-medium break-words text-neutral-900">{value}</span>
    </div>
  );
}

function timelineText(entry: SupportTicketDetailDTO["timeline"][number]): string {
  const base = TIMELINE_LABEL[entry.action] ?? entry.action;
  const { from, to } = entry.detail;
  if (typeof from === "string" && typeof to === "string" && entry.action.includes("status")) {
    return `${base}: ${STATUS_LABEL[from as keyof typeof STATUS_LABEL] ?? from} → ${STATUS_LABEL[to as keyof typeof STATUS_LABEL] ?? to}`;
  }
  if (entry.detail.orderNumber) return `${base}: ${entry.detail.orderNumber}`;
  if (entry.detail.ownedByCustomer === false) return `${base} (no es del cliente)`;
  return base;
}

/** Ficha lateral del ticket: solo lectura, con lo que MIMO ya sabe del cliente, el pedido y el negocio. */
export function TicketContext({ detail }: { detail: SupportTicketDetailDTO }) {
  const { customer, order, business, timeline, ticket, permissions } = detail;

  return (
    <div className="flex flex-col gap-4">
      <Section icon={<User className="size-3.5" />} title="Cliente">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{customer.name}</p>
          {customer.isGuest && <p className="text-xs text-neutral-400">Visitante sin cuenta</p>}
        </div>
        <Row label="Correo" value={customer.email ?? "—"} />
        {!customer.isGuest && <Row label="Teléfono" value={customer.phone ?? "—"} />}
        {customer.memberSince && <Row label="Cliente desde" value={new Date(customer.memberSince).toLocaleDateString("es-SV")} />}
        {!customer.isGuest && (
          <>
            <Row label="Pedidos" value={customer.orderCount} />
            <Row label="Tickets" value={customer.ticketCount} />
          </>
        )}
        {customer.previousTickets.length > 0 && (
          <div className="mt-1">
            <p className="mb-1 text-xs text-neutral-400">Tickets anteriores</p>
            <ul className="flex flex-col gap-1">
              {customer.previousTickets.map((previous) => (
                <li key={previous.id}>
                  <Link href={`/centro-soporte?t=${previous.id}`} className="block rounded-md px-1.5 py-1 text-xs hover:bg-neutral-100">
                    <span className="font-mono text-neutral-500">{previous.code}</span> · {STATUS_LABEL[previous.status]}
                    <span className="block truncate text-neutral-700">{previous.subject}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {customer.recentOrders.length > 0 && (
          <div className="mt-1">
            <p className="mb-1 text-xs text-neutral-400">Últimos pedidos</p>
            <ul className="flex flex-col gap-1">
              {customer.recentOrders.map((recent) => (
                <li key={recent.orderNumber} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs">
                  <span className="font-mono text-neutral-700">{recent.orderNumber}</span>
                  <span className="text-neutral-500">
                    {ORDER_STATUS_LABEL[recent.status]} · {formatMoney(recent.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section icon={<Package className="size-3.5" />} title="Pedido relacionado">
        {!order ? (
          <p className="text-sm text-neutral-400">Este ticket no tiene un pedido vinculado.</p>
        ) : (
          <>
            {order.belongsToCustomer === false && (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Este pedido NO es de este cliente. Verificá antes de compartir información.
              </p>
            )}
            <p className="font-mono text-sm font-semibold text-neutral-900">Pedido #{order.orderNumber}</p>
            <Row label="Estado" value={ORDER_STATUS_LABEL[order.status]} />
            <Row label="Comprador" value={order.buyerName} />
            <Row label="Total" value={formatMoney(order.total, order.currency)} />
            <Row label="Creado" value={formatDateTime(order.createdAt)} />
            {order.payment && (
              <Row
                label="Pago"
                value={`${PAYMENT_PROVIDER_LABEL[order.payment.provider]} · ${PAYMENT_STATUS_LABEL[order.payment.status]}`}
              />
            )}
            {order.isSurprise && <Row label="Modo sorpresa" value="Sí: no revelar quién lo envía" />}
            <Row label="Municipio" value={order.deliveryMunicipality ?? "—"} />
            <ul className="mt-1 flex flex-col gap-1.5">
              {order.items.map((item, index) => (
                <li key={index} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs">
                  <p className="font-medium text-neutral-900">
                    {item.quantity}× {item.productName}
                  </p>
                  <p className="text-neutral-500">
                    {item.businessName} · {ORDER_STATUS_LABEL[item.status]} · {timeAgo(item.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-neutral-400">
              MIMO no tiene repartidores propios ni seguimiento en vivo: cada negocio entrega por su cuenta y actualiza el estado
              desde su panel. Por eso no hay datos de repartidor ni ubicación.
            </p>
            {order.hasAddress && <AddressReveal ticketId={ticket.id} canReveal={permissions.canNote} />}
          </>
        )}
      </Section>

      <Section icon={<Building2 className="size-3.5" />} title="Negocio relacionado">
        {!business ? (
          <p className="text-sm text-neutral-400">Este ticket no tiene un negocio vinculado.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-neutral-900">{business.name}</p>
            <Row label="Estado" value={business.status} />
            <Row label="Municipio" value={business.municipality ?? "—"} />
            <Row label="Teléfono" value={business.phone ?? "—"} />
            <Link href={`/negocios/${business.slug}`} target="_blank" className="text-xs text-neutral-500 underline hover:text-neutral-900">
              Ver página pública del negocio
            </Link>
          </>
        )}
      </Section>

      <Section icon={<History className="size-3.5" />} title="Historial">
        {timeline.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin movimientos todavía.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {timeline.map((entry, index) => (
              <li key={index} className="text-xs">
                <p className="text-neutral-800">{timelineText(entry)}</p>
                <p className="text-neutral-400">
                  {entry.actorName ?? "Sistema"} · {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
