"use client";

import { Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AuthSessionUser } from "@mimo/types";

const NAV_LINKS = [{ href: "/regalos", label: "Regalos" }];

export function MobileNav({ user }: { user: AuthSessionUser | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>MIMO</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Separator className="my-2" />
        <div className="flex flex-col gap-2 px-4">
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Cerrar sesión
            </button>
          ) : (
            <>
              <Link
                href="/iniciar-sesion"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-neutral-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
