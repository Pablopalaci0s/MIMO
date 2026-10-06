import { useId } from "react";
import { cn } from "cn";

/**
 * Gráficos del centro de soporte en SVG puro: sin librería, renderizados en el
 * servidor y legibles en claro y oscuro (el texto usa la escala `neutral`, que
 * se invierte sola en `.dark`). Cada gráfico lleva `role="img"` con un resumen
 * y tooltips nativos (`<title>`), y nada depende solo del color: siempre hay
 * etiquetas o leyenda con los números.
 */

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-05" → "5 oct". */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

/** Tope "redondo" del eje Y y paso entre líneas guía (siempre enteros: son conteos de tickets). */
export function niceScale(maxValue: number, ticks = 4): { max: number; step: number } {
  if (maxValue <= ticks) return { max: ticks, step: 1 };
  const raw = maxValue / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  return { max: step * ticks, step };
}

export interface TrendSeries {
  key: string;
  label: string;
  values: number[];
  /** Clases Tailwind del trazo (`stroke-*`) y del color del texto de la leyenda (`text-*`). */
  stroke: string;
  text: string;
  /** Solo la primera serie lleva relleno degradado. */
  area?: boolean;
}

/** Líneas con área, eje Y con líneas guía y fechas en el eje X. */
export function TrendChart({ dates, series, summary }: { dates: string[]; series: TrendSeries[]; summary: string }) {
  const gradientId = useId();
  const W = 760;
  const H = 310;
  const left = 34;
  const right = 10;
  const top = 10;
  const bottom = 26;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const count = dates.length;
  const peak = Math.max(0, ...series.flatMap((item) => item.values));
  const { max, step } = niceScale(peak);

  const x = (index: number) => left + (count <= 1 ? plotW / 2 : (index / (count - 1)) * plotW);
  const y = (value: number) => top + plotH - (value / max) * plotH;

  // Pocas etiquetas de fecha: siempre la primera y la última, y las del medio parejas.
  const labelEvery = Math.max(1, Math.ceil(count / 7));
  const showLabel = (index: number) => index === 0 || index === count - 1 ? true : index % labelEvery === 0 && count - 1 - index >= labelEvery / 2;
  const gridValues = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const bandW = count <= 1 ? plotW : plotW / (count - 1);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-neutral-600">
            <span className={cn("h-0.5 w-4 rounded-full bg-current", item.text)} aria-hidden />
            {item.label}
            <span className="font-semibold text-neutral-900 tabular-nums">{item.values.reduce((sum, value) => sum + value, 0)}</span>
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => (
          <g key={value}>
            <line x1={left} x2={W - right} y1={y(value)} y2={y(value)} className="stroke-neutral-200" strokeDasharray={value === 0 ? undefined : "3 4"} />
            <text x={left - 8} y={y(value) + 3.5} textAnchor="end" className="fill-neutral-400 text-[10px] tabular-nums">
              {value}
            </text>
          </g>
        ))}

        {series.map((item) => {
          const points = item.values.map((value, index) => `${x(index)},${y(value)}`);
          return (
            <g key={item.key}>
              {item.area && count > 1 && (
                <path
                  d={`M ${x(0)},${y(0)} L ${points.join(" L ")} L ${x(count - 1)},${y(0)} Z`}
                  fill={`url(#${gradientId})`}
                  className={item.text}
                />
              )}
              <polyline points={points.join(" ")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={item.stroke} />
              {count <= 31 &&
                item.values.map((value, index) => (
                  <circle key={index} cx={x(index)} cy={y(value)} r={2.5} className={cn("fill-white dark:fill-neutral-100", item.stroke)} strokeWidth={1.5} />
                ))}
            </g>
          );
        })}

        {dates.map((date, index) =>
          showLabel(index) ? (
            <text key={date} x={x(index)} y={H - 6} textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"} className="fill-neutral-400 text-[10px]">
              {shortDate(date)}
            </text>
          ) : null,
        )}

        {/* Bandas invisibles por día: el tooltip nativo muestra todas las series de ese día. */}
        {dates.map((date, index) => (
          <rect key={date} x={x(index) - bandW / 2} y={top} width={bandW} height={plotH} fill="transparent">
            <title>{`${shortDate(date)} — ${series.map((item) => `${item.label}: ${item.values[index]}`).join(" · ")}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  /** Clase Tailwind `stroke-*` del tramo y `bg-*` de la leyenda. */
  stroke: string;
  swatch: string;
}

/** Anillo con el total al centro y la leyenda (con números y porcentajes) al lado. */
export function Donut({ segments, centerLabel, summary }: { segments: DonutSegment[]; centerLabel: string; summary: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((segment) => segment.value > 0);
  const gap = visible.length > 1 ? 1.5 : 0;

  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 120 120" role="img" aria-label={summary} className="size-40 shrink-0">
        <circle cx={60} cy={60} r={radius} fill="none" strokeWidth={14} className="stroke-neutral-100" />
        {total > 0 &&
          visible.map((segment) => {
            const length = (segment.value / total) * circumference;
            const dash = Math.max(0, length - gap);
            const circle = (
              <circle
                key={segment.key}
                cx={60}
                cy={60}
                r={radius}
                fill="none"
                strokeWidth={14}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
                className={segment.stroke}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </circle>
            );
            offset += length;
            return circle;
          })}
        <text x={60} y={58} textAnchor="middle" className="fill-neutral-900 text-[22px] font-semibold tabular-nums">
          {total}
        </text>
        <text x={60} y={73} textAnchor="middle" className="fill-neutral-400 text-[8px] tracking-wider uppercase">
          {centerLabel}
        </text>
      </svg>
      <ul className="grid w-full gap-y-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-sm", segment.swatch)} aria-hidden />
            <span className="truncate text-neutral-600">{segment.label}</span>
            <span className="ml-auto font-semibold text-neutral-900 tabular-nums">{segment.value}</span>
            <span className="w-9 text-right text-xs text-neutral-400 tabular-nums">{total > 0 ? `${Math.round((segment.value / total) * 100)}%` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Clase `bg-*` de la barra. */
  bar: string;
  hint?: string;
}

/** Barras horizontales con etiqueta a la izquierda y valor a la derecha. */
export function BarRows({ items, emptyText }: { items: BarItem[]; emptyText: string }) {
  if (items.length === 0 || items.every((item) => item.value === 0)) return <p className="py-6 text-center text-sm text-neutral-400">{emptyText}</p>;
  const max = Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={item.hint}>
          <span className="truncate text-neutral-700">{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <span className={cn("block h-full rounded-full", item.bar)} style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-semibold text-neutral-900">{item.value}</span>
            <span className="w-8 text-right text-xs text-neutral-400">{Math.round((item.value / total) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Carga de trabajo por persona: abiertos y resueltos como barras lado a lado. */
export function WorkloadRows({ rows, resolvedLabel }: { rows: { key: string; name: string; open: number; resolved: number }[]; resolvedLabel: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-neutral-400">Todavía no hay tickets asignados.</p>;
  const max = Math.max(1, ...rows.flatMap((row) => [row.open, row.resolved]));
  return (
    <div>
      <ul className="mb-3 flex gap-5 text-xs text-neutral-600">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sc-primary" aria-hidden /> Abiertos ahora
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sc-success" aria-hidden /> {resolvedLabel}
        </li>
      </ul>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className="grid grid-cols-[8rem_1fr] items-center gap-3 text-sm">
            <span className="flex items-center gap-2 truncate text-neutral-800">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600" aria-hidden>
                {initials(row.name)}
              </span>
              <span className="truncate">{row.name}</span>
            </span>
            <span className="flex flex-col gap-1">
              {[
                { value: row.open, bar: "bg-sc-primary", label: "abiertos" },
                { value: row.resolved, bar: "bg-sc-success", label: "resueltos" },
              ].map((entry) => (
                <span key={entry.label} className="flex items-center gap-2" title={`${entry.value} ${entry.label}`}>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <span className={cn("block h-full rounded-full", entry.bar)} style={{ width: `${(entry.value / max) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right text-xs font-semibold text-neutral-700 tabular-nums">{entry.value}</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]![0] ?? "") + (parts.length > 1 ? (parts.at(-1)![0] ?? "") : "")).toUpperCase();
}

/** Distribución de calificaciones: 5★ arriba, con la cantidad y el porcentaje de cada una. */
export function RatingDistribution({ distribution, average, count }: { distribution: number[]; average: number | null; count: number }) {
  const max = Math.max(1, ...distribution);
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="min-w-24">
        <p className="text-4xl font-semibold tracking-tight text-neutral-900 tabular-nums">{average === null ? "—" : average.toFixed(1)}</p>
        <Stars value={average ?? 0} />
        <p className="mt-1 text-xs text-neutral-400">
          {count} {count === 1 ? "calificación" : "calificaciones"}
        </p>
      </div>
      <ul className="flex min-w-44 flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const value = distribution[stars - 1] ?? 0;
          return (
            <li key={stars} className="grid grid-cols-[1.75rem_1fr_2.25rem] items-center gap-2 text-xs">
              <span className="text-neutral-500 tabular-nums">{stars} ★</span>
              <span className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <span className={cn("block h-full rounded-full", stars >= 4 ? "bg-sc-success" : stars === 3 ? "bg-amber-400" : "bg-sc-danger")} style={{ width: `${(value / max) * 100}%` }} />
              </span>
              <span className="text-right font-medium text-neutral-700 tabular-nums">{value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className="relative size-4 text-neutral-200" aria-hidden>
            <StarShape />
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${fill * 100}%` }}>
              <StarShape />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function StarShape() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0 fill-current">
      <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L10 14.9 4.7 17.8l1.1-5.9L1.4 7.8l6-.8L10 1.5z" />
    </svg>
  );
}

/** Barra apilada de dos o más tramos (ej. asistente vs. personas) con porcentajes. */
export function StackedBar({ segments, emptyText }: { segments: { key: string; label: string; value: number; bar: string }[]; emptyText: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <p className="py-3 text-sm text-neutral-400">{emptyText}</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(", ")}>
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span key={segment.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", segment.bar)} style={{ width: `${(segment.value / total) * 100}%` }} title={`${segment.label}: ${segment.value}`} />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-start gap-2">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-sm", segment.bar)} aria-hidden />
            <span>
              <span className="block text-lg leading-tight font-semibold text-neutral-900 tabular-nums">
                {segment.value} <span className="text-xs font-normal text-neutral-400">{Math.round((segment.value / total) * 100)}%</span>
              </span>
              <span className="text-xs text-neutral-500">{segment.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mini gráfico de línea sin ejes para las tarjetas de indicadores. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2 || values.every((value) => value === 0)) return null;
  const W = 96;
  const H = 30;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * W},${H - 2 - (value / max) * (H - 4)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-8 w-24 overflow-visible", className)} aria-hidden>
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
