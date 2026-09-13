"use client";

import {
  Bell,
  ChevronDown,
  Gift,
  Heart,
  Home,
  LifeBuoy,
  LogOut,
  type LucideIcon,
  Package,
  PartyPopper,
  Store,
  User as UserIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthSessionUser } from "@mimo/types";

const ROLE_LABEL: Record<AuthSessionUser["role"], string> = {
  USER: "Cliente",
  BUSINESS: "Negocio",
  ADMIN: "Administrador",
};

const ITEM_CLASS = "rounded-lg py-2 pr-2.5 pl-1.5 [&_svg]:size-3.5";

function MenuIcon({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "brand" | "destructive" }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "neutral" && "bg-neutral-100 text-neutral-500",
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

function initials(user: AuthSessionUser) {
  const source = user.name ?? user.email ?? "?";
  return source
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function firstName(user: AuthSessionUser): string {
  return (user.name ?? user.email ?? "Cuenta").split(" ")[0]!;
}

export function UserMenu({ user, variant = "icon" }: { user: AuthSessionUser; variant?: "icon" | "tab" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          variant === "tab"
            ? "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-neutral-400 outline-none aria-expanded:text-neutral-900"
            : "flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-neutral-100 focus-visible:ring-3 focus-visible:ring-ring/50"
        }
      >
        {variant === "tab" ? (
          <>
            <Avatar size="sm" className="size-5">
              <AvatarFallback className="bg-neutral-900 text-[9px] text-neutral-50">
                {initials(user)}
              </AvatarFallback>
            </Avatar>
            Perfil
          </>
        ) : (
          <>
            <Avatar size="sm">
              <AvatarFallback className="bg-neutral-900 text-xs text-neutral-50">
                {initials(user)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-neutral-700 sm:inline">{firstName(user)}</span>
            <ChevronDown className="hidden size-3.5 text-neutral-400 sm:inline" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="w-72 max-w-[calc(100vw-1.5rem)] p-1.5"
      >
        <div className="mb-1 flex items-center gap-3 rounded-lg bg-neutral-50 px-2.5 py-3">
          <Avatar size="sm" className="size-10">
            <AvatarFallback className="bg-neutral-900 text-sm font-medium text-white">
              {initials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{user.name ?? user.email}</p>
            <Badge variant="outline" className="mt-1 h-5 border-neutral-200 px-1.5 text-[10px] font-normal text-neutral-500">
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
        </div>

        {(user.role === "BUSINESS" || user.role === "ADMIN") && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className={ITEM_CLASS}>
                <Link href={user.role === "BUSINESS" ? "/negocio" : "/admin"}>
                  <MenuIcon icon={Store} />
                  Panel {user.role === "BUSINESS" ? "de negocio" : "admin"}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-1.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
            Regalos
          </DropdownMenuLabel>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/perfil/listas">
              <MenuIcon icon={Gift} tone="brand" /> Listas de regalos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/perfil/cabudas">
              <MenuIcon icon={PartyPopper} tone="brand" /> Cabudas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/favoritos">
              <MenuIcon icon={Heart} tone="brand" /> Mis favoritos
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-1.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
            Mi cuenta
          </DropdownMenuLabel>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/">
              <MenuIcon icon={Home} /> Inicio
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/mis-pedidos">
              <MenuIcon icon={Package} /> Mis pedidos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/notificaciones">
              <MenuIcon icon={Bell} /> Notificaciones
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/perfil">
              <MenuIcon icon={UserIcon} /> Mi perfil
            </Link>
          </DropdownMenuItem>
          {user.role === "USER" && (
            <DropdownMenuItem asChild className={ITEM_CLASS}>
              <Link href="/registro-negocio">
                <MenuIcon icon={Store} /> Sumá tu negocio
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/ayuda">
              <MenuIcon icon={LifeBuoy} /> Ayuda
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} variant="destructive" className={ITEM_CLASS}>
          <MenuIcon icon={LogOut} tone="destructive" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
