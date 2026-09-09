import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="text-lg font-semibold tracking-tight text-neutral-900">MIMO</p>
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
        </nav>
      </div>

      <div className="border-t border-neutral-100 px-4 py-5 text-center text-xs text-neutral-400 sm:px-6">
        © {new Date().getFullYear()} MIMO. Todos los derechos reservados.
      </div>
    </footer>
  );
}
