"use client";

import { ChevronDown, Home, LifeBuoy, LogOut, Package, Store, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
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
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate font-medium">{user.name ?? user.email}</p>
          <p className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home /> Inicio
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/mis-pedidos">
            <Package /> Mis pedidos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserIcon /> Mi perfil
          </Link>
        </DropdownMenuItem>
        {user.role === "BUSINESS" && (
          <DropdownMenuItem asChild>
            <Link href="/negocio">
              <Store /> Panel de negocio
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Store /> Panel admin
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "USER" && (
          <DropdownMenuItem asChild>
            <Link href="/registro-negocio">
              <Store /> Sumá tu negocio
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/ayuda">
            <LifeBuoy /> Ayuda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} variant="destructive">
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
