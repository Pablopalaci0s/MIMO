import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { GiftRegistryList } from "@/components/account/gift-registry-list";
import { listMyRegistries } from "@/lib/services/gift-registry-service";

export const metadata: Metadata = { title: "Listas de regalos" };

export default async function GiftRegistriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/perfil/listas");

  const registries = await listMyRegistries(session.user.id);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Listas de regalos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Compartí un link con tu lista para que la gente te regale algo que de verdad querés, sin duplicados.
      </p>
      <div className="mt-8">
        <GiftRegistryList registries={registries} />
      </div>
    </div>
  );
}
