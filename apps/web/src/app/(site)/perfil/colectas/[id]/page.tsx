import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { GroupGiftManager } from "@/components/account/group-gift-manager";
import { getGroupGiftForManage } from "@/lib/services/group-gift-service";

export const metadata: Metadata = { title: "Editar colecta" };

export default async function ManageGroupGiftPage({ params }: PageProps<"/perfil/colectas/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const { id } = await params;
  const gift = await getGroupGiftForManage(session.user.id, id).catch(() => null);
  if (!gift) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{gift.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">Regalo: {gift.productName}</p>
      <div className="mt-8">
        <GroupGiftManager gift={gift} />
      </div>
    </div>
  );
}
