import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { SupportCategoryDTO, SupportStaffMemberDTO } from "@mimo/types";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABEL, STATUS_LABEL } from "./labels";

const inputClass =
  "h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 dark:bg-neutral-100";

/**
 * Filtros de la bandeja: un formulario GET simple (sin JavaScript). Al
 * enviarlo, la URL lleva los filtros y la lista se vuelve a pedir al servidor,
 * que es quien decide qué puede ver cada rol.
 */
export function TicketFilters({
  values,
  categories,
  staff,
  isManager,
}: {
  values: Record<string, string | undefined>;
  categories: SupportCategoryDTO[];
  staff: SupportStaffMemberDTO[];
  isManager: boolean;
}) {
  const active = ["status", "priority", "category", "agent", "from", "to", "order", "business", "ticket"].some((key) => values[key]);

  return (
    <form action="/centro-soporte" method="get" className="flex flex-col gap-2">
      <input type="hidden" name="view" value={values.view ?? "sin_asignar"} />
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-neutral-400" />
        <input name="q" defaultValue={values.q} placeholder="Buscar cliente, correo o asunto…" aria-label="Buscar" className={`${inputClass} pl-8`} />
      </div>

      <details open={active} className="group rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:bg-neutral-100">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-600 select-none"><SlidersHorizontal className="size-3.5" /> Filtros{active ? " (activos)" : ""}</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            Estado
            <select name="status" defaultValue={values.status ?? ""} className={inputClass}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            Prioridad
            <select name="priority" defaultValue={values.priority ?? ""} className={inputClass}>
              <option value="">Todas</option>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-neutral-500">
            Categoría
            <select name="category" defaultValue={values.category ?? ""} className={inputClass}>
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-neutral-500">
            Agente
            <select name="agent" defaultValue={values.agent ?? ""} className={inputClass}>
              <option value="">Cualquiera</option>
              <option value="me">Yo</option>
              <option value="none">Sin asignar</option>
              {isManager &&
                staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            Desde
            <input type="date" name="from" defaultValue={values.from} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            Hasta
            <input type="date" name="to" defaultValue={values.to} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            N.º de pedido
            <input name="order" defaultValue={values.order} placeholder="MIMO-…" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
            ID de ticket
            <input name="ticket" defaultValue={values.ticket} placeholder="T-1042" className={inputClass} />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-neutral-500">
            Negocio
            <input name="business" defaultValue={values.business} placeholder="Nombre del negocio" className={inputClass} />
          </label>
        </div>
      </details>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">
          Buscar
        </Button>
        {(active || values.q) && (
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href={`/centro-soporte?view=${values.view ?? "sin_asignar"}`}>Limpiar</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
