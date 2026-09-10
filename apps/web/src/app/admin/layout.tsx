import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Panel administrativo — MIMO" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/admin");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Panel administrativo</p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">MIMO</h1>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
