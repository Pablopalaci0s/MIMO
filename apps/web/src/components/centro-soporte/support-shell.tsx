"use client";

import { BarChart3, ExternalLink, Inbox, Lock, LogOut, Menu, SlidersHorizontal, Star } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { MimoMark } from "@/components/brand/mimo-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { AuthSessionUser } from "@mimo/types";
import { initials } from "./charts";

/**
 * Consola del personal de soporte: riel angosto de íconos (verde petróleo, igual
 * en claro y oscuro), barra superior con el logo de MIMO y, abajo del riel, el
 * menú de la persona con su nombre de usuario. Las colas (vistas) no están acá:
 * se eligen dentro de la bandeja, con su contador.
 */

const ROLE_LABEL: Record<AuthSessionUser["role"], string> = {
  USER: "Cliente",
  BUSINESS: "Negocio",
  ADMIN: "Administrador",
  SUPPORT_AGENT: "Agente de soporte",
  SUPPORT_MANAGER: "Supervisor de soporte",
};

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
  /** Número que se muestra sobre el ícono (ej. tickets sin asignar). */
  badge?: number;
}

const iconClass = "size-5";

function buildNav({ isManager, unassigned }: { isManager: boolean; unassigned: number }): NavItem[] {
  return [
    { href: "/centro-soporte?view=sin_asignar", label: "Tickets", icon: <Inbox className={iconClass} />, match: (p) => p === "/centro-soporte", badge: unassigned },
    {
      href: "/centro-soporte/calificaciones",
      label: isManager ? "Calificaciones" : "Mis calificaciones",
      icon: <Star className={iconClass} />,
      match: (p) => p.startsWith("/centro-soporte/calificaciones"),
    },
    ...(isManager
      ? [
          { href: "/centro-soporte/metricas", label: "Métricas", icon: <BarChart3 className={iconClass} />, match: (p: string) => p.startsWith("/centro-soporte/metricas") },
          {
            href: "/centro-soporte/configuracion",
            label: "Categorías y respuestas",
            icon: <SlidersHorizontal className={iconClass} />,
            match: (p: string) => p.startsWith("/centro-soporte/configuracion"),
          },
        ]
      : []),
  ];
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex size-10 items-center justify-center rounded-lg text-sc-rail-fg transition-colors",
        active ? "bg-sc-rail-active text-white" : "hover:bg-sc-rail-hover hover:text-white",
      )}
    >
      {item.icon}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-sc-danger px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      <span className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-neutral-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {item.label}
      </span>
    </Link>
  );
}

function UserMenu({ user, username, side }: { user: AuthSessionUser; username: string | null; side: "right" | "bottom" }) {
  const name = user.name ?? user.email ?? "Cuenta";
  const display = username ? `@${username}` : name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mi cuenta"
        className="flex size-10 items-center justify-center rounded-full bg-sc-rail-hover text-xs font-semibold text-white outline-none ring-2 ring-transparent transition hover:ring-white/30 focus-visible:ring-white/60"
      >
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={side === "right" ? "end" : "end"} sideOffset={10} className="w-72 p-1.5">
        <div className="flex items-center gap-3 rounded-md bg-neutral-50 px-3 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sc-rail text-sm font-semibold text-white">{initials(name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{display}</p>
            <p className="truncate text-xs text-neutral-500">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <DropdownMenuLabel className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Nombre de usuario</DropdownMenuLabel>
        <p className="flex items-start gap-2 px-3 pb-2 text-xs text-neutral-600">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
          {username ? (
            <span>
              <strong className="font-semibold text-neutral-800">{username}</strong> es lo que ven los clientes. Se eligió una sola vez y no se puede cambiar; si hace falta, lo cambia un administrador.
            </span>
          ) : (
            <span>Todavía no elegiste uno. Los clientes ven tu nombre de pila.</span>
          )}
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-md py-2">
          <Link href="/">
            <ExternalLink className="size-4" /> Ir al sitio de MIMO
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: "/" })} className="rounded-md py-2">
          <LogOut className="size-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** El logo de MIMO tal cual está en el sitio (palabra + corazón), con el nombre del área aparte. */
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/" aria-label="MIMO — ir al sitio" className="group flex items-center gap-1.5 text-lg font-semibold tracking-tight text-neutral-900">
        MIMO
        <MimoMark className="size-6 text-[#f98079] transition-transform duration-300 group-hover:scale-110" />
      </Link>
      <span className="hidden h-5 w-px bg-neutral-300 sm:block" aria-hidden />
      <span className="hidden text-sm font-medium text-neutral-500 sm:block">Centro de soporte</span>
    </div>
  );
}

export function SupportShell({
  unassigned,
  isManager,
  user,
  username,
  children,
}: {
  unassigned: number;
  isManager: boolean;
  user: AuthSessionUser;
  username: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = buildNav({ isManager, unassigned });

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Riel de íconos (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center bg-sc-rail py-3 lg:flex">
        <Link href="/" aria-label="MIMO" className="mb-5 flex size-10 items-center justify-center rounded-lg hover:bg-sc-rail-hover">
          <MimoMark className="size-6 text-[#f98079]" />
        </Link>
        <nav aria-label="Centro de soporte" className="flex flex-1 flex-col items-center gap-1.5">
          {items.map((item) => (
            <RailLink key={item.href} item={item} active={item.match(pathname)} />
          ))}
        </nav>
        <UserMenu user={user} username={username} side="right" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6 dark:bg-neutral-100">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 bg-sc-rail p-0 text-sc-rail-fg">
              <SheetTitle className="sr-only">Navegación del centro de soporte</SheetTitle>
              <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5 text-white">
                <span className="text-base font-semibold">MIMO</span>
                <MimoMark className="size-5 text-[#f98079]" />
                <span className="ml-1 text-xs tracking-wider text-sc-rail-fg uppercase">Soporte</span>
              </div>
              <nav aria-label="Centro de soporte" className="flex flex-col gap-1 p-3">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={item.match(pathname) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      item.match(pathname) ? "bg-sc-rail-active text-white" : "hover:bg-sc-rail-hover hover:text-white",
                    )}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-sc-danger px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Logo />

          <span className="ml-auto hidden items-center gap-1.5 text-xs text-neutral-500 sm:flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sc-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-sc-success" />
            </span>
            En vivo
          </span>
          <div className="ml-auto sm:ml-0 lg:hidden">
            <UserMenu user={user} username={username} side="bottom" />
          </div>
        </header>
        <main className="min-h-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
