import { Clock, LayoutDashboard, Package, ShieldCheck, ShoppingBag, Store, Truck, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { Button } from "@/components/ui/button";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { AgreementBanner } from "@/components/negocio/agreement-banner";
import { NewOrderWatcher } from "@/components/negocio/new-order-watcher";
import { BUSINESS_AGREEMENT_VERSION } from "@/lib/legal/business-agreement";
import { hasAcceptedCurrentAgreement } from "@/lib/services/business-agreement-service";
import { getMissingDocuments } from "@/lib/services/business-document-service";
import { getBusinessIdForUser } from "@/lib/services/business-service";
import { prisma } from "@mimo/database";

export const metadata: Metadata = { title: "Panel de negocio — MIMO" };

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/negocio", label: "Resumen", icon: <LayoutDashboard className="size-4" />, exact: true },
  { href: "/negocio/pedidos", label: "Pedidos", icon: <Package className="size-4" /> },
  { href: "/negocio/productos", label: "Productos", icon: <ShoppingBag className="size-4" /> },
  { href: "/negocio/horarios", label: "Horarios", icon: <Clock className="size-4" /> },
  { href: "/negocio/zonas-de-entrega", label: "Zonas de entrega", icon: <Truck className="size-4" /> },
  { href: "/negocio/perfil", label: "Perfil", icon: <User className="size-4" /> },
  { href: "/negocio/verificacion", label: "Verificación", icon: <ShieldCheck className="size-4" /> },
];

export default async function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/negocio");

  let businessName: string | null = null;
  let agreementPending = false;
  let missingDocuments = 0;
  try {
    const businessId = await getBusinessIdForUser(session.user.id);
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true, isDemo: true } });
    businessName = business?.name ?? null;
    agreementPending = business !== null && !business.isDemo && !(await hasAcceptedCurrentAgreement(businessId));
    if (business !== null && !business.isDemo) missingDocuments = (await getMissingDocuments(businessId)).length;
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
      <NewOrderWatcher />
      {agreementPending && <AgreementBanner version={BUSINESS_AGREEMENT_VERSION} />}
      {missingDocuments > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900">Falta verificar tu identidad</p>
            <p className="mt-0.5 text-sm text-neutral-600">
              Subí tu DUI (frente y reverso) y una foto tuya con el DUI para que podamos aprobar tu negocio.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <Link href="/negocio/verificacion">Subir documentos</Link>
            </Button>
          </div>
        </div>
      )}
      {children}
    </DashboardShell>
  );
}
