import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { FavoritesList } from "@/components/account/favorites-list";

export const metadata: Metadata = { title: "Mis favoritos" };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/favoritos");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Mis favoritos</h1>
      <p className="mt-1 text-sm text-neutral-500">Productos y negocios que guardaste.</p>

      <div className="mt-8">
        <FavoritesList />
      </div>
    </div>
  );
}
