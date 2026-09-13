import Link from "next/link";
import { MimoMark } from "@/components/brand/mimo-mark";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white pb-16 dark:bg-neutral-50 sm:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-neutral-900">
            MIMO
            <MimoMark className="size-4 text-[#f98079]" />
          </p>
          <p className="mt-2 max-w-xs text-sm text-neutral-500">
            Regalos para hacerle el día a alguien. Hecho en El Salvador 🇸🇻
          </p>
        </div>

        <nav className="flex gap-12 text-sm text-neutral-500">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Explorar
            </span>
            <Link href="/regalos" className="transition-colors hover:text-neutral-900">
              Regalos
            </Link>
            <Link href="/ayuda" className="transition-colors hover:text-neutral-900">
              Ayuda
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Cuenta
            </span>
            <Link href="/iniciar-sesion" className="transition-colors hover:text-neutral-900">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="transition-colors hover:text-neutral-900">
              Crear cuenta
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Legal
            </span>
            <Link href="/terminos" className="transition-colors hover:text-neutral-900">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="transition-colors hover:text-neutral-900">
              Privacidad
            </Link>
          </div>
        </nav>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-neutral-100 px-4 py-5 text-center text-xs text-neutral-400 sm:flex-row sm:justify-between sm:px-6">
        <span>© {new Date().getFullYear()} MIMO. Todos los derechos reservados.</span>
        <span className="flex gap-3">
          <Link href="/terminos" className="hover:text-neutral-600">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-neutral-600">
            Privacidad
          </Link>
        </span>
      </div>
    </footer>
  );
}
