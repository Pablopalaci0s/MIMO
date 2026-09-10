import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/negocio/dashboard-nav";
import { getBusinessIdForUser } from "@/lib/services/business-service";
import { prisma } from "@mimo/database";

export const metadata: Metadata = { title: "Panel de negocio — MIMO" };

export default async function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/negocio");

  let businessName: string | null = null;
  try {
    const businessId = await getBusinessIdForUser(session.user.id);
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
    businessName = business?.name ?? null;
  } catch {
    businessName = null;
  }

  if (!businessName) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <Store className="size-8 text-neutral-300" />
        <h1 className="text-xl font-semibold text-neutral-900">Todavía no tenés un negocio</h1>
        <p className="text-sm text-neutral-500">
          Tu cuenta tiene rol de negocio, pero no está vinculada a ningún negocio en MIMO todavía.
        </p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Panel de negocio</p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{businessName}</h1>
      </div>
      <DashboardNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
