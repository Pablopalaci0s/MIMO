import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { NotificationsPageList } from "@/components/account/notifications-page-list";

export const metadata: Metadata = { title: "Notificaciones — MIMO" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/notificaciones");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Notificaciones</h1>
      <p className="mt-1 text-sm text-neutral-500">Novedades de tus pedidos, negocio y fechas importantes.</p>

      <div className="mt-8">
        <NotificationsPageList />
      </div>
    </div>
  );
}
