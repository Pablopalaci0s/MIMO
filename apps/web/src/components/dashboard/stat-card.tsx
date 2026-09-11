import { cn } from "cn";
import type { ReactNode } from "react";

export function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 dark:bg-neutral-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          highlight ? "bg-brand-soft text-brand" : "bg-neutral-100 text-neutral-600",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-tight text-neutral-900">{value}</p>
        <p className="truncate text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}
