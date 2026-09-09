"use client";

import { LogOut, Package, User as UserIcon } from "lucide-react";
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

export function UserMenu({ user }: { user: AuthSessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar size="sm">
          <AvatarFallback className="bg-neutral-900 text-xs text-white">
            {initials(user)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-medium">{user.name ?? user.email}</p>
          <p className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/mis-pedidos">
            <Package /> Mis pedidos
          </Link>
        </DropdownMenuItem>
        {user.role === "BUSINESS" && (
          <DropdownMenuItem asChild>
            <Link href="/negocio">
              <UserIcon /> Panel de negocio
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <UserIcon /> Panel admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut()} variant="destructive">
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
