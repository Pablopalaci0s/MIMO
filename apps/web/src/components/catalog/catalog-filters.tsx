"use client";

import { Zap } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCategoryIcon } from "@/lib/category-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryDTO } from "@mimo/types";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "sales", label: "Más vendidos" },
  { value: "rating", label: "Mejor valorados" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
];

export function CatalogFilters({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const activeCategory = searchParams.get("categoria");
  const activeSort = searchParams.get("orden") ?? "relevance";
  const availableToday = searchParams.get("disponibleHoy") === "true";

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          onClick={() => updateParam("categoria", null)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !activeCategory
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          Todo
        </button>
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          const active = activeCategory === category.slug;
          return (
            <button
              key={category.id}
              onClick={() => updateParam("categoria", active ? null : category.slug)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateParam("disponibleHoy", availableToday ? null : "true")}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            availableToday
              ? "border-brand bg-brand-soft text-brand"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          <Zap className="size-3.5" strokeWidth={1.75} />
          Disponible hoy
        </button>

        <div className="ml-auto">
          <Select value={activeSort} onValueChange={(value) => updateParam("orden", value)}>
            <SelectTrigger className="w-[190px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
