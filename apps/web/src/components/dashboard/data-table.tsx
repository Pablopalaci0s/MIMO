import { cn } from "cn";
import type { ReactNode } from "react";

export interface DataTableColumn {
  label: string;
  className?: string;
}

export function DataTable({
  columns,
  children,
  isEmpty,
  emptyMessage,
}: {
  columns: DataTableColumn[];
  children: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  if (isEmpty) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
        {emptyMessage ?? "No hay resultados todavía."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs font-medium tracking-wide text-neutral-400 uppercase">
            {columns.map((column, index) => (
              <th key={index} className={cn("py-3 first:pl-4 last:pr-4", column.className)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
