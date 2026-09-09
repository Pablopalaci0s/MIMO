import Link from "next/link";
import { auth, signOut } from "@mimo/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">MIMO</h1>
        <p className="mt-2 text-neutral-500">Regalos para hacerle el día a alguien.</p>
      </div>

      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
        Fase 1 completa: arquitectura, base de datos y autenticación. El diseño de la
        home (hero de IA, categorías, catálogo) llega en la Fase 2.
      </p>

      {session?.user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm">
            Sesión iniciada como <strong>{session.user.name}</strong> ({session.user.role})
          </p>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : (
        <div className="flex justify-center gap-3">
          <Link
            href="/iniciar-sesion"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Crear cuenta
          </Link>
        </div>
      )}
    </main>
  );
}
