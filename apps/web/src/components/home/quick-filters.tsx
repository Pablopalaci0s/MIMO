import { Clock, Star, Tag } from "lucide-react";
import Link from "next/link";

const FILTERS = [
  { href: "/regalos?disponibleHoy=true", label: "Entrega hoy", icon: Clock },
  { href: "/regalos?oferta=true", label: "Ofertas", icon: Tag },
  { href: "/regalos?orden=rating", label: "Mejor valorados", icon: Star },
];

export function QuickFilters() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          return (
            <Link
              key={filter.href}
              href={filter.href}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 dark:bg-neutral-100 text-sm font-medium whitespace-nowrap text-neutral-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md"
            >
              <Icon className="size-3.5 text-neutral-500" strokeWidth={1.75} />
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
