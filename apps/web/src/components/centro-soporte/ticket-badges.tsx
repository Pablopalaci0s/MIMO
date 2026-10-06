import type { SupportTicketPriority, SupportTicketStatus } from "@mimo/types";
import { cn } from "cn";
import { PRIORITY_DOT, PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE } from "./labels";

/** Etiqueta rectangular de estado (como en una herramienta de tickets, no una píldora de app de consumo). */
export function StatusBadge({ status, className }: { status: SupportTicketStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium whitespace-nowrap", STATUS_TONE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Punto de color + texto: la prioridad nunca depende solo del color. */
export function PriorityTag({ priority, className }: { priority: SupportTicketPriority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600", className)}>
      <span className={cn("size-2 rounded-full", PRIORITY_DOT[priority])} aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
