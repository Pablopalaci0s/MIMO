import Link from "next/link";
import { auth } from "@mimo/auth";
import { Button } from "@/components/ui/button";
import { CartSheet } from "./cart-sheet";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [{ href: "/regalos", label: "Regalos" }];

export async function Header() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          MIMO
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-600 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative py-1 transition-colors duration-200 hover:text-neutral-900"
            >
              {link.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-neutral-900 transition-transform duration-200 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <CartSheet />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" className="transition-transform active:scale-[0.98]" asChild>
                <Link href="/iniciar-sesion">Iniciar sesión</Link>
              </Button>
              <Button className="transition-transform active:scale-[0.98]" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </div>
          )}
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
