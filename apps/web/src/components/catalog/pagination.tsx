import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function CatalogPagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Link
        href={buildHref(Math.max(page - 1, 1))}
        aria-disabled={page <= 1}
        className={`flex size-9 items-center justify-center rounded-full border border-neutral-200 transition-colors ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <ChevronLeft className="size-4" />
      </Link>

      <span className="text-sm text-neutral-500">
        Página {page} de {totalPages}
      </span>

      <Link
        href={buildHref(Math.min(page + 1, totalPages))}
        aria-disabled={page >= totalPages}
        className={`flex size-9 items-center justify-center rounded-full border border-neutral-200 transition-colors ${
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
