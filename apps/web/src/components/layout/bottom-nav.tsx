import { User as UserIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@mimo/auth";
import { BottomNavLink } from "./bottom-nav-link";
import { CartSheet } from "./cart-sheet";
import { UserMenu } from "./user-menu";

export async function BottomNav() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
      <BottomNavLink href="/" label="Inicio" icon="home" />
      <BottomNavLink href="/regalos" label="Buscar" icon="search" />
      <CartSheet variant="tab" />
      {user ? (
        <UserMenu user={user} variant="tab" />
      ) : (
        <Link
          href="/iniciar-sesion"
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-neutral-400"
        >
          <UserIcon className="size-5" strokeWidth={1.75} />
          Perfil
        </Link>
      )}
    </nav>
  );
}
