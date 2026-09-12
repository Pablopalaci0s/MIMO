import Link from "next/link";
import { auth } from "@mimo/auth";
import { MimoMark } from "@/components/brand/mimo-mark";
import { Button } from "@/components/ui/button";
import { CartSheet } from "./cart-sheet";
import { NavLinks } from "./nav-links";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export async function Header() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-1.5 text-lg font-semibold tracking-tight text-neutral-900"
        >
          MIMO
          <MimoMark className="size-6 animate-pulse text-[#f98079] transition-transform duration-300 group-hover:scale-125" />
        </Link>

        <NavLinks />

        <div className="hidden items-center gap-1 sm:flex">
          {user && <NotificationBell />}
          <CartSheet />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="transition-transform active:scale-[0.98]" asChild>
                <Link href="/iniciar-sesion">Iniciar sesión</Link>
              </Button>
              <Button variant="brand" className="rounded-full transition-transform active:scale-[0.98]" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
