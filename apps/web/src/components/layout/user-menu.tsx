"use client";

import {
  Bell,
  ChevronDown,
  Gift,
  Heart,
  Home,
  LifeBuoy,
  LogOut,
  Package,
  PartyPopper,
  Store,
  User as UserIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
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
              <AvatarFallback className="bg-neutral-900 text-[9px] text-white">
                {initials(user)}
              </AvatarFallback>
            </Avatar>
            Perfil
          </>
        ) : (
          <>
            <Avatar size="sm">
              <AvatarFallback className="bg-neutral-900 text-xs text-white">
                {initials(user)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-neutral-700 sm:inline">{firstName(user)}</span>
            <ChevronDown className="hidden size-3.5 text-neutral-400 sm:inline" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <Avatar size="sm" className="size-9">
            <AvatarFallback className="bg-neutral-900 text-sm text-white">{initials(user)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900">{user.name ?? user.email}</p>
            <Badge variant="outline" className="mt-0.5 h-4.5 px-1.5 text-[10px] text-neutral-500">
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        {(user.role === "BUSINESS" || user.role === "ADMIN") && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={user.role === "BUSINESS" ? "/negocio" : "/admin"}>
                  <Store className="text-neutral-500" />
                  Panel {user.role === "BUSINESS" ? "de negocio" : "admin"}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuLabel>Regalos</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/perfil/listas">
              <Gift className="text-neutral-500" /> Listas de regalos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/perfil/colectas">
              <PartyPopper className="text-neutral-500" /> Colectas grupales
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/favoritos">
              <Heart className="text-neutral-500" /> Mis favoritos
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/">
              <Home className="text-neutral-500" /> Inicio
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/mis-pedidos">
              <Package className="text-neutral-500" /> Mis pedidos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notificaciones">
              <Bell className="text-neutral-500" /> Notificaciones
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <UserIcon className="text-neutral-500" /> Mi perfil
            </Link>
          </DropdownMenuItem>
          {user.role === "USER" && (
            <DropdownMenuItem asChild>
              <Link href="/registro-negocio">
                <Store className="text-neutral-500" /> Sumá tu negocio
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/ayuda">
              <LifeBuoy className="text-neutral-500" /> Ayuda
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} variant="destructive">
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
