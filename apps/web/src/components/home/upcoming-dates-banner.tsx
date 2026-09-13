import { ArrowRight, CalendarHeart } from "lucide-react";
import Link from "next/link";
import type { ImportantDateDTO } from "@mimo/types";

function daysLabel(daysUntil: number): string {
  if (daysUntil === 0) return "es hoy";
  if (daysUntil === 1) return "es mañana";
  return `es en ${daysUntil} días`;
}

export function UpcomingDatesBanner({ dates }: { dates: ImportantDateDTO[] }) {
  const upcoming = dates.filter((date) => date.daysUntil >= 0 && date.daysUntil <= date.remindDaysBefore);
  if (upcoming.length === 0) return null;

  const [next] = upcoming;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <Link
        href="/ayudame-a-elegir"
        className="group flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft/50 px-4 py-3 shadow-sm transition-all hover:bg-brand-soft hover:shadow-[0_10px_24px_-14px_var(--brand)]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm dark:bg-neutral-100">
          <CalendarHeart className="size-4" />
        </span>
        <p className="flex-1 text-sm text-neutral-800">
          <span className="font-medium">{next.label}</span> {daysLabel(next.daysUntil)}
          {upcoming.length > 1 ? ` (y ${upcoming.length - 1} fecha${upcoming.length > 2 ? "s" : ""} más)` : ""} —
          dejá que te ayudemos a elegir el regalo.
        </p>
        <ArrowRight className="size-4 shrink-0 -translate-x-1 text-brand opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
      </Link>
    </div>
  );
}
