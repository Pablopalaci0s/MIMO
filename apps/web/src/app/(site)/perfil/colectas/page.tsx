import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { GroupGiftList } from "@/components/account/group-gift-list";
import { listMyGroupGifts } from "@/lib/services/group-gift-service";

export const metadata: Metadata = { title: "Colectas grupales" };

export default async function GroupGiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/perfil/colectas");

  const gifts = await listMyGroupGifts(session.user.id);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Colectas grupales</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Juntá entre varios para un regalo más grande — compartí el link y cerrá la colecta cuando esté lista.
      </p>
      <div className="mt-8">
        <GroupGiftList gifts={gifts} />
      </div>
    </div>
  );
}
