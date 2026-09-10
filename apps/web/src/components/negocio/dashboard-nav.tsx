"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { href: "/negocio", label: "Resumen" },
  { href: "/negocio/pedidos", label: "Pedidos" },
  { href: "/negocio/productos", label: "Productos" },
  { href: "/negocio/horarios", label: "Horarios" },
  { href: "/negocio/zonas-de-entrega", label: "Zonas de entrega" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const isActive = tab.href === "/negocio" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
