import { ArrowDownRight, ArrowUpRight, MessageSquareQuote, Minus, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { supportRatingsQuerySchema } from "@mimo/validation";
import type { SupportRatingKind, SupportRatingSummaryDTO } from "@mimo/types";
import { RatingDistribution, StackedBar, initials } from "@/components/centro-soporte/charts";
import { Kpi, KpiStrip, Panel } from "@/components/centro-soporte/console-ui";
import { timeAgo } from "@/components/centro-soporte/labels";
import { UnauthorizedPanel } from "@/components/centro-soporte/unauthorized-panel";
import { AppError } from "@/lib/errors";
import { resolveSupportStaff } from "@/lib/services/support-access-service";
import { getSupportProfile } from "@/lib/services/support-profile-service";
import { getSupportRatings } from "@/lib/services/support-ratings-service";
import { isManager } from "@/lib/support/ticket-rules";

const RANGES = [7, 30, 90] as const;
const KINDS: { kind: SupportRatingKind; label: string }[] = [
  { kind: "all", label: "Todas" },
  { kind: "good", label: "Satisfechos" },
  { kind: "neutral", label: "Neutrales" },
  { kind: "bad", label: "Insatisfechos" },
];

/** Diferencia en puntos porcentuales contra el período anterior (null si falta alguno de los dos). */
function pointsChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

function PointsDelta({ value, better }: { value: number | null; better: "up" | "down" }) {
  if (value === null) return <span className="text-[11px] text-neutral-400">sin período previo para comparar</span>;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-neutral-500">
        <Minus className="size-3" /> igual que antes
      </span>
    );
  }
  const up = value > 0;
  const good = (better === "up") === up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", good ? "text-sc-success" : "text-sc-danger")}>
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value)} pts <span className="font-normal text-neutral-400">vs. período previo</span>
    </span>
  );
}

function kindOf(rating: number): { label: string; tone: string } {
  if (rating >= 4) return { label: "Satisfecho", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" };
  if (rating === 3) return { label: "Neutral", tone: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200" };
  return { label: "Insatisfecho", tone: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" };
}

function tabCount(kind: SupportRatingKind, summary: SupportRatingSummaryDTO): number {
  return kind === "good" ? summary.satisfied : kind === "neutral" ? summary.neutral : kind === "bad" ? summary.dissatisfied : summary.count;
}

export default async function SupportRatingsPage({ searchParams }: PageProps<"/centro-soporte/calificaciones">) {
  // Cada persona ve las suyas; supervisión puede mirar a cualquiera. Verificado contra la base en cada carga.
  const actor = await resolveSupportStaff();
  if (!actor) return <UnauthorizedPanel />;
  const manager = isManager(actor);

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as Record<string, string | undefined>;
  const parsed = supportRatingsQuerySchema.safeParse({ days: flat.dias, agent: flat.agente, kind: flat.tipo });
  const query = parsed.success ? parsed.data : supportRatingsQuerySchema.parse({});

  let data;
  try {
    data = await getSupportRatings(actor, query);
  } catch (error) {
    if (error instanceof AppError && (error.status === 403 || error.status === 404)) {
      return <UnauthorizedPanel message={error.message} />;
    }
    throw error;
  }
  const profile = await getSupportProfile(actor);
  const { summary, previous } = data;

  const href = (changes: { dias?: number; tipo?: SupportRatingKind }) => {
    const params = new URLSearchParams();
    params.set("dias", String(changes.dias ?? data.rangeDays));
    const kind = changes.tipo ?? data.kind;
    if (kind !== "all") params.set("tipo", kind);
    if (manager && data.scope.agentId) params.set("agente", data.scope.agentId);
    return `/centro-soporte/calificaciones?${params.toString()}`;
  };

  return (
    <div className="mx-auto flex max-w-[84rem] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sc-rail text-sm font-semibold text-white" aria-hidden>
            {initials(data.scope.isSelf ? profile.name : data.scope.label)}
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{data.scope.isSelf ? "Mis calificaciones" : `Calificaciones · ${data.scope.label}`}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {data.scope.isSelf && profile.username ? (
                <>
                  <span className="font-medium text-neutral-700">@{profile.username}</span> · es el nombre que ven tus clientes ·{" "}
                </>
              ) : null}
              Últimos {data.rangeDays} días, comparados con los {data.rangeDays} anteriores.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {manager && (
            <form action="/centro-soporte/calificaciones" method="get" className="flex items-center gap-1.5">
              <input type="hidden" name="dias" value={data.rangeDays} />
              {data.kind !== "all" && <input type="hidden" name="tipo" value={data.kind} />}
              <label className="sr-only" htmlFor="rating-agent">
                Persona
              </label>
              <select id="rating-agent" name="agente" defaultValue={data.scope.agentId ?? ""} className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-[13px] text-neutral-900 dark:bg-neutral-100">
                <option value="">Todo el equipo</option>
                {data.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.username ? ` (@${agent.username})` : ""}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-8 rounded-md border border-neutral-300 bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-100">
                Ver
              </button>
            </form>
          )}
          <nav aria-label="Período" className="inline-flex overflow-hidden rounded-md border border-neutral-200 bg-white text-xs font-medium dark:bg-neutral-100">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={href({ dias: range })}
                aria-current={range === data.rangeDays ? "page" : undefined}
                className={cn("border-r border-neutral-200 px-3.5 py-1.5 last:border-r-0", range === data.rangeDays ? "bg-neutral-900 text-neutral-50" : "text-neutral-600 hover:bg-neutral-50")}
              >
                {range} días
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <KpiStrip>
        <Kpi
          label="CSAT · satisfechos"
          value={summary.csatPercent === null ? "—" : String(summary.csatPercent)}
          unit={summary.csatPercent === null ? undefined : "%"}
          footer={<PointsDelta value={pointsChange(summary.csatPercent, previous.csatPercent)} better="up" />}
        />
        <Kpi
          label="DSAT · insatisfechos"
          value={summary.dsatPercent === null ? "—" : String(summary.dsatPercent)}
          unit={summary.dsatPercent === null ? undefined : "%"}
          tone={summary.dissatisfied > 0 && (summary.dsatPercent ?? 0) >= 20 ? "alert" : "default"}
          footer={<PointsDelta value={pointsChange(summary.dsatPercent, previous.dsatPercent)} better="down" />}
        />
        <Kpi
          label="Promedio de estrellas"
          value={summary.average === null ? "—" : summary.average.toFixed(2)}
          unit={summary.average === null ? undefined : "/ 5"}
          footer={<span className="text-[11px] text-neutral-400">{previous.average === null ? "sin período previo" : `Antes: ${previous.average.toFixed(2)}`}</span>}
        />
        <Kpi
          label="Calificaciones recibidas"
          value={String(summary.count)}
          footer={<span className="text-[11px] text-neutral-400">{previous.count === 0 ? "sin período previo" : `Antes: ${previous.count}`}</span>}
        />
      </KpiStrip>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Distribución" subtitle="Cuántas calificaciones recibió cada cantidad de estrellas">
          <RatingDistribution distribution={summary.distribution} average={summary.average} count={summary.count} />
        </Panel>
        <Panel title="Satisfacción" subtitle="CSAT = 4 y 5 estrellas · DSAT = 1 y 2 estrellas · 3 es neutral">
          <StackedBar
            emptyText="Todavía no hay calificaciones en el período."
            segments={[
              { key: "good", label: "Satisfechos (4–5 ★)", value: summary.satisfied, bar: "bg-sc-success" },
              { key: "neutral", label: "Neutrales (3 ★)", value: summary.neutral, bar: "bg-amber-400" },
              { key: "bad", label: "Insatisfechos (1–2 ★)", value: summary.dissatisfied, bar: "bg-sc-danger" },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Calificaciones y comentarios"
        subtitle={data.matching > data.items.length ? `Las ${data.items.length} más recientes de ${data.matching}` : `${data.matching} ${data.matching === 1 ? "calificación" : "calificaciones"}`}
        action={
          <nav aria-label="Tipo de calificación" className="flex flex-wrap gap-1">
            {KINDS.map((entry) => (
              <Link
                key={entry.kind}
                href={href({ tipo: entry.kind })}
                aria-current={entry.kind === data.kind ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                  entry.kind === data.kind ? "bg-neutral-900 text-neutral-50" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                {entry.label}
                <span className={cn("rounded px-1 text-[10px] tabular-nums", entry.kind === data.kind ? "bg-white/20" : "bg-neutral-100 text-neutral-500")}>{tabCount(entry.kind, summary)}</span>
              </Link>
            ))}
          </nav>
        }
      >
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <MessageSquareQuote className="size-5" />
            </span>
            <p className="text-sm font-medium text-neutral-800">{data.kind === "all" ? "Todavía no hay calificaciones" : "No hay calificaciones de este tipo"}</p>
            <p className="max-w-sm text-xs text-neutral-500">
              {data.scope.isSelf ? "Aparecen cuando un cliente califica un ticket que resolviste vos." : "Aparecen cuando un cliente califica un ticket resuelto."}
            </p>
          </div>
        ) : (
          <ul className="-my-1 divide-y divide-neutral-200">
            {data.items.map((item) => {
              const kind = kindOf(item.rating);
              return (
                <li key={item.ticketId} className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-start sm:gap-5">
                  <div className="flex shrink-0 flex-col gap-1.5 sm:w-36">
                    <span className="flex gap-0.5" role="img" aria-label={`${item.rating} de 5 estrellas`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={cn("size-4", star <= item.rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200")} />
                      ))}
                    </span>
                    <span className={cn("inline-flex h-5 w-fit items-center rounded px-1.5 text-[11px] font-medium", kind.tone)}>{kind.label}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.comment ? <p className="text-sm leading-relaxed text-neutral-800">«{item.comment}»</p> : <p className="text-sm text-neutral-400">Sin comentario</p>}
                    <p className="mt-1 text-xs text-neutral-500">
                      <Link href={`/centro-soporte?view=resueltos&t=${item.ticketId}`} className="font-mono font-semibold text-sc-primary hover:underline">
                        {item.ticketCode}
                      </Link>{" "}
                      · {item.subject} · {item.categoryName}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-neutral-500 sm:text-right">
                    <span className="font-medium text-neutral-700">{item.customerName}</span>
                    <br />
                    {timeAgo(item.ratedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
