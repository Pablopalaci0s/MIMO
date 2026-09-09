import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="text-lg font-semibold tracking-tight">MIMO</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Regalos para hacerle el día a alguien. Hecho en El Salvador 🇸🇻
          </p>
        </div>

        <nav className="flex gap-8 text-sm text-neutral-500">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-neutral-900">Explorar</span>
            <Link href="/regalos" className="hover:text-neutral-900">
              Regalos
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-neutral-900">Cuenta</span>
            <Link href="/iniciar-sesion" className="hover:text-neutral-900">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="hover:text-neutral-900">
              Crear cuenta
            </Link>
          </div>
        </nav>
      </div>

      <div className="border-t border-neutral-200 px-4 py-4 text-center text-xs text-neutral-400 sm:px-6">
        © {new Date().getFullYear()} MIMO. Todos los derechos reservados.
      </div>
    </footer>
  );
}
