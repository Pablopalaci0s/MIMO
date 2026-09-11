import { Building2, GalleryHorizontal, LayoutDashboard, MapPin, MessageSquareWarning, Star, Tags, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = { title: "Panel administrativo — MIMO" };

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin", label: "Resumen", icon: <LayoutDashboard className="size-4" />, exact: true },
  { href: "/admin/negocios", label: "Negocios", icon: <Building2 className="size-4" /> },
  { href: "/admin/usuarios", label: "Usuarios", icon: <Users className="size-4" /> },
  { href: "/admin/categorias", label: "Categorías", icon: <Tags className="size-4" /> },
  { href: "/admin/banners", label: "Banners", icon: <GalleryHorizontal className="size-4" /> },
  { href: "/admin/reportes", label: "Reportes", icon: <MessageSquareWarning className="size-4" /> },
  { href: "/admin/resenas", label: "Reseñas", icon: <Star className="size-4" /> },
  { href: "/admin/cobertura", label: "Cobertura", icon: <MapPin className="size-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/admin");

  return (
    <DashboardShell brand="MIMO" subtitle="Panel administrativo" navItems={NAV_ITEMS} user={session.user}>
      {children}
    </DashboardShell>
  );
}
