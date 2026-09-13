import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { GiftRegistryManager } from "@/components/account/gift-registry-manager";
import { getRegistryForManage } from "@/lib/services/gift-registry-service";

export const metadata: Metadata = { title: "Editar lista de regalos" };

export default async function ManageGiftRegistryPage({ params }: PageProps<"/perfil/listas/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const { id } = await params;
  const registry = await getRegistryForManage(session.user.id, id).catch(() => null);
  if (!registry) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{registry.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">Compartí el link y agregá los regalos que te gustaría recibir.</p>
      <div className="mt-8">
        <GiftRegistryManager registry={registry} />
      </div>
    </div>
  );
}
