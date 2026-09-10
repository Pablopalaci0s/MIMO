import { Clock, LayoutDashboard, Package, ShoppingBag, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { Button } from "@/components/ui/button";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { getBusinessIdForUser } from "@/lib/services/business-service";
import { prisma } from "@mimo/database";

export const metadata: Metadata = { title: "Panel de negocio — MIMO" };

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/negocio", label: "Resumen", icon: <LayoutDashboard className="size-4" />, exact: true },
  { href: "/negocio/pedidos", label: "Pedidos", icon: <Package className="size-4" /> },
  { href: "/negocio/productos", label: "Productos", icon: <ShoppingBag className="size-4" /> },
  { href: "/negocio/horarios", label: "Horarios", icon: <Clock className="size-4" /> },
  { href: "/negocio/zonas-de-entrega", label: "Zonas de entrega", icon: <Truck className="size-4" /> },
];

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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
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
    <DashboardShell brand={businessName} subtitle="Panel de negocio" navItems={NAV_ITEMS} user={session.user}>
      {children}
    </DashboardShell>
  );
}
