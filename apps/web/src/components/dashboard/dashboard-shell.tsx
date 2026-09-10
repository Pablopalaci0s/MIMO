"use client";

import { ArrowLeft, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/layout/user-menu";
import type { AuthSessionUser } from "@mimo/types";

export interface DashboardNavItem {
  href: string;
  label: string;
  /** Ícono ya renderizado (ej. `<Home className="size-4" />`), nunca el
   * componente sin renderizar — este array cruza de Server a Client
   * Component y un tipo de componente no es serializable (ver gotcha en
   * CLAUDE.md sobre RSC). */
  icon: ReactNode;
  exact?: boolean;
}

function SidebarNav({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: DashboardNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  brand,
  subtitle,
  navItems,
  user,
  children,
}: {
  brand: string;
  subtitle: string;
  navItems: DashboardNavItem[];
  user: AuthSessionUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-neutral-200 px-5">
          <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
            MIMO
          </Link>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{subtitle}</p>
          <p className="truncate text-sm font-semibold text-neutral-900">{brand}</p>
        </div>

        <SidebarNav navItems={navItems} pathname={pathname} />

        <div className="border-t border-neutral-200 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            <ArrowLeft className="size-4" />
            Volver al sitio
          </Link>
          <div className="mt-1 px-1">
            <UserMenu user={user} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <div className="flex h-16 items-center border-b border-neutral-200 px-5">
                <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
                  MIMO
                </Link>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{subtitle}</p>
                <p className="truncate text-sm font-semibold text-neutral-900">{brand}</p>
              </div>
              <SidebarNav navItems={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-neutral-200 p-3">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-100"
                >
                  <ArrowLeft className="size-4" />
                  Volver al sitio
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-medium text-neutral-900">{brand}</span>
          <UserMenu user={user} />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
