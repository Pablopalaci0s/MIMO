import Link from "next/link";
import { cn } from "cn";
import { BarRows, Donut, RatingDistribution, Sparkline, StackedBar, TrendChart, WorkloadRows } from "@/components/centro-soporte/charts";
import { Delta, Kpi, KpiStrip, Panel } from "@/components/centro-soporte/console-ui";
import { PRIORITY_BAR, PRIORITY_LABEL, STATUS_CHART, STATUS_LABEL, formatMinutes } from "@/components/centro-soporte/labels";
import { UnauthorizedPanel } from "@/components/centro-soporte/unauthorized-panel";
import { resolveSupportStaff } from "@/lib/services/support-access-service";
import { getSupportMetrics } from "@/lib/services/support-metrics-service";
import { isManager, percentChange, satisfactionBreakdown } from "@/lib/support/ticket-rules";
import type { SupportTicketPriority, SupportTicketStatus } from "@mimo/types";

const RANGES = [7, 30, 90] as const;
const STATUS_ORDER: SupportTicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS", "ESCALATED", "RESOLVED", "CLOSED"];

export default async function SupportMetricsPage({ searchParams }: PageProps<"/centro-soporte/metricas">) {
  // Solo supervisión y administración, verificado contra la base en cada carga.
  const actor = await resolveSupportStaff();
  if (!actor || !isManager(actor)) {
    return <UnauthorizedPanel message="Las métricas del centro de soporte son solo para supervisores y administradores." />;
  }

  const raw = await searchParams;
  const requested = Number(Array.isArray(raw.dias) ? raw.dias[0] : raw.dias);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;
  const metrics = await getSupportMetrics(days);

  const dates = metrics.daily.map((day) => day.date);
  const createdValues = metrics.daily.map((day) => day.created);
  const resolvedValues = metrics.daily.map((day) => day.resolved);
  const satisfaction = satisfactionBreakdown(metrics.csat.distribution);
  const resolutionRate = metrics.created > 0 ? Math.round((metrics.resolved / metrics.created) * 100) : null;

  return (
    <div className="mx-auto flex max-w-[84rem] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Métricas de soporte</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Últimos {days} días, comparados con los {days} anteriores. «Ahora» es la foto de este momento.
          </p>
        </div>
        <nav aria-label="Período" className="inline-flex overflow-hidden rounded-md border border-neutral-200 bg-white text-xs font-medium dark:bg-neutral-100">
          {RANGES.map((range) => (
            <Link
              key={range}
              href={`/centro-soporte/metricas?dias=${range}`}
              aria-current={range === days ? "page" : undefined}
              className={cn(
                "border-r border-neutral-200 px-3.5 py-1.5 last:border-r-0",
                range === days ? "bg-neutral-900 text-neutral-50" : "text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {range} días
            </Link>
          ))}
        </nav>
      </div>

      <KpiStrip>
        <Kpi
          label="Tickets creados"
          value={String(metrics.created)}
          spark={<Sparkline values={createdValues} />}
          footer={<Delta value={percentChange(metrics.created, metrics.previous.created)} better="none" />}
        />
        <Kpi
          label="Tickets resueltos"
          value={String(metrics.resolved)}
          spark={<Sparkline values={resolvedValues} className="text-sc-success" />}
          footer={
            <span className="flex flex-wrap items-center gap-x-2">
              <Delta value={percentChange(metrics.resolved, metrics.previous.resolved)} better="up" />
              {resolutionRate !== null && <span className="text-[11px] text-neutral-400">· {resolutionRate} % de lo creado</span>}
            </span>
          }
        />
        <Kpi label="Primera respuesta (promedio)" value={formatMinutes(metrics.avgFirstResponseMinutes)} footer={<span className="text-[11px] text-neutral-400">De la creación a la primera respuesta de una persona</span>} />
        <Kpi label="Resolución (promedio)" value={formatMinutes(metrics.avgResolutionMinutes)} footer={<span className="text-[11px] text-neutral-400">De la creación a la resolución</span>} />
        <Kpi label="Abiertos ahora" value={String(metrics.open)} footer={<span className="text-[11px] text-neutral-400">Todo lo que no está resuelto ni cerrado</span>} />
        <Kpi
          label="Sin atender ahora"
          value={String(metrics.pending)}
          tone={metrics.pending > 0 ? "alert" : "default"}
          footer={<span className="text-[11px] text-neutral-400">Nuevos y abiertos sin primera respuesta</span>}
        />
        <Kpi
          label="Urgentes ahora"
          value={String(metrics.urgent)}
          tone={metrics.urgent > 0 ? "alert" : "default"}
          footer={<span className="text-[11px] text-neutral-400">Prioridad urgente, sin resolver</span>}
        />
        <Kpi
          label="CSAT · satisfechos"
          value={satisfaction.csatPercent === null ? "—" : String(satisfaction.csatPercent)}
          unit={satisfaction.csatPercent === null ? undefined : "%"}
          footer={
            <span className="text-[11px] text-neutral-400">
              {satisfaction.count === 0
                ? "Sin calificaciones en el período"
                : `DSAT ${satisfaction.dsatPercent} % · promedio ${satisfaction.average?.toFixed(1)} · ${satisfaction.count} ${satisfaction.count === 1 ? "calificación" : "calificaciones"}`}
            </span>
          }
        />
      </KpiStrip>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Volumen de tickets" subtitle="Creados y resueltos por día" className="lg:col-span-2">
          <TrendChart
            dates={dates}
            summary={`Tickets creados y resueltos por día en los últimos ${days} días: ${metrics.created} creados y ${metrics.resolved} resueltos.`}
            series={[
              { key: "created", label: "Creados", values: createdValues, stroke: "stroke-sc-primary", text: "text-sc-primary", area: true },
              { key: "resolved", label: "Resueltos", values: resolvedValues, stroke: "stroke-sc-success", text: "text-sc-success" },
            ]}
          />
        </Panel>

        <Panel title="Estado actual" subtitle="Todos los tickets, ahora">
          <Donut
            centerLabel="tickets"
            summary={`Tickets por estado: ${STATUS_ORDER.map((status) => `${STATUS_LABEL[status]} ${metrics.byStatus[status]}`).join(", ")}.`}
            segments={STATUS_ORDER.map((status) => ({
              key: status,
              label: STATUS_LABEL[status],
              value: metrics.byStatus[status],
              ...STATUS_CHART[status],
            }))}
          />
        </Panel>

        <Panel title="Por categoría" subtitle={`Creados en los últimos ${days} días`}>
          <BarRows
            emptyText="Sin tickets en el período."
            items={metrics.byCategory.slice(0, 8).map((category) => ({ key: category.slug, label: category.name, value: category.count, bar: "bg-sc-primary" }))}
          />
        </Panel>

        <Panel title="Abiertos por prioridad" subtitle="Lo que sigue sin resolver, ahora">
          <BarRows
            emptyText="No hay tickets abiertos."
            items={(["URGENT", "HIGH", "NORMAL", "LOW"] as SupportTicketPriority[]).map((priority) => ({
              key: priority,
              label: PRIORITY_LABEL[priority],
              value: metrics.byPriority[priority],
              bar: PRIORITY_BAR[priority],
            }))}
          />
        </Panel>

        <Panel title="Asistente vs. personas" subtitle="Quién resolvió las conversaciones del período">
          <StackedBar
            emptyText="Todavía no hay conversaciones resueltas en el período."
            segments={[
              { key: "bot", label: "Resueltas por el asistente", value: metrics.resolvedByBot, bar: "bg-violet-500" },
              { key: "human", label: "Resueltas por una persona", value: metrics.resolvedByHuman, bar: "bg-sc-primary" },
            ]}
          />
          <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            El asistente escaló <strong className="font-semibold text-neutral-800">{metrics.escalatedByBot}</strong>{" "}
            {metrics.escalatedByBot === 1 ? "ticket" : "tickets"} a una persona. «Resueltas por el asistente» son conversaciones que la persona cerró sin pasar a soporte.
          </p>
        </Panel>

        <Panel title="Carga por persona" subtitle="Abiertos ahora y resueltos en el período" className="lg:col-span-2">
          <WorkloadRows
            resolvedLabel={`Resueltos (${days} d)`}
            rows={metrics.byAgent.map((row) => ({ key: row.agentId ?? "sin-asignar", name: row.name, open: row.open, resolved: row.resolved }))}
          />
        </Panel>

        <Panel title="Satisfacción del cliente" subtitle="Calificaciones de 1 a 5 estrellas">
          <RatingDistribution distribution={metrics.csat.distribution} average={metrics.csat.average} count={metrics.csat.count} />
        </Panel>
      </div>
    </div>
  );
}
