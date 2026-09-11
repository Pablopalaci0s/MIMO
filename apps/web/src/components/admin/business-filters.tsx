"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "SUSPENDED", label: "Suspendidos" },
  { value: "REJECTED", label: "Rechazados" },
];

export function BusinessFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const status = searchParams.get("estado") ?? "all";

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query === current) return;
    const timeout = setTimeout(() => updateParam("q", query.trim() || null), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre..."
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white pr-8 pl-8 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Select value={status} onValueChange={(value) => updateParam("estado", value)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
