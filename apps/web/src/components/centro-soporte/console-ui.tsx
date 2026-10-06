import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

/** Bloques de la consola del centro de soporte: planos, con borde fino y poco radio (aspecto de herramienta de trabajo). */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-neutral-200 bg-white dark:bg-neutral-100", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

/** ▲ 12 % / ▼ 8 % contra el período anterior. `better` dice qué dirección es buena (o ninguna). */
export function Delta({ value, better }: { value: number | null; better: "up" | "down" | "none" }) {
  if (value === null) return <span className="text-[11px] text-neutral-400">sin período previo</span>;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-neutral-500">
        <Minus className="size-3" /> igual que antes
      </span>
    );
  }
  const up = value > 0;
  const good = better === "none" ? null : (better === "up") === up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        good === null ? "text-neutral-500" : good ? "text-sc-success dark:text-emerald-400" : "text-sc-danger",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value) > 999 ? "+999" : Math.abs(value)} % <span className="font-normal text-neutral-400">vs. período previo</span>
    </span>
  );
}

/** Franja de indicadores: celdas separadas por líneas finas (gap de 1 px sobre fondo de borde) dentro de un solo marco. */
export function KpiStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 lg:grid-cols-4">{children}</div>;
}

export function Kpi({
  label,
  value,
  unit,
  footer,
  spark,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  footer?: ReactNode;
  spark?: ReactNode;
  tone?: "default" | "alert";
}) {
  return (
    <div className="flex min-h-28 flex-col justify-between gap-2 bg-white p-4 dark:bg-neutral-100">
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={cn("text-3xl leading-none font-semibold tracking-tight tabular-nums", tone === "alert" ? "text-sc-danger" : "text-neutral-900")}>
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-neutral-400">{unit}</span>}
        </p>
        {spark && <span className="text-sc-primary/70">{spark}</span>}
      </div>
      <div className="min-h-4">{footer}</div>
    </div>
  );
}
