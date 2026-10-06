"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportTicketView } from "@mimo/types";
import { VIEW_LABEL } from "./labels";

const GROUPS: { title: string; views: SupportTicketView[] }[] = [
  { title: "Mi trabajo", views: ["sin_asignar", "mios", "todos"] },
  { title: "Por estado", views: ["nuevos", "en_atencion", "esperando_cliente", "esperando_negocio", "escalados"] },
  { title: "Historial", views: ["resueltos", "cerrados"] },
];

/**
 * Selector de vista (cola) de la bandeja, con el contador de cada una. El
 * contador de "sin asignar" se marca cuando hay tickets esperando.
 */
export function ViewSwitcher({
  active,
  counts,
  isManager,
}: {
  active: SupportTicketView;
  counts: Record<SupportTicketView, number>;
  isManager: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex min-w-0 items-center gap-2 rounded-md px-2 py-1 -ml-2 text-left outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-sc-primary/40 data-[state=open]:bg-neutral-100">
        <span className="truncate text-[15px] font-semibold text-neutral-900">{VIEW_LABEL[active]}</span>
        <span className="rounded bg-neutral-200 px-1.5 text-[11px] leading-5 font-semibold text-neutral-700 tabular-nums">{counts[active]}</span>
        <ChevronDown className="size-4 shrink-0 text-neutral-500 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        {GROUPS.map((group, index) => {
          const views = group.views.filter((view) => isManager || view !== "todos");
          return (
            <div key={group.title}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">{group.title}</DropdownMenuLabel>
              {views.map((view) => (
                <DropdownMenuItem key={view} asChild className="rounded-md py-2">
                  <Link href={`/centro-soporte?view=${view}`} className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center">{view === active && <Check className="size-4 text-sc-primary" />}</span>
                    <span className={cn("flex-1", view === active && "font-semibold")}>{VIEW_LABEL[view]}</span>
                    <span
                      className={cn(
                        "min-w-6 rounded px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums",
                        view === "sin_asignar" && counts[view] > 0 ? "bg-sc-danger text-white" : "bg-neutral-100 text-neutral-600",
                      )}
                    >
                      {counts[view]}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
