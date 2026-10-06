import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@mimo/auth";
import { SupportShell } from "@/components/centro-soporte/support-shell";
import { UsernameSetup } from "@/components/centro-soporte/username-setup";
import { UnauthorizedPanel } from "@/components/centro-soporte/unauthorized-panel";
import { resolveSupportStaff } from "@/lib/services/support-access-service";
import { getSupportProfile } from "@/lib/services/support-profile-service";
import { getQueueCounts } from "@/lib/services/support-ticket-service";
import { isManager } from "@/lib/support/ticket-rules";

export const metadata: Metadata = { title: "Centro de soporte — MIMO" };

/**
 * Área del personal de soporte (agentes, supervisores y administradores),
 * separada de `/admin` a propósito. El acceso se verifica contra la base en
 * cada carga (ver `support-access-service.ts`); el layout no es la única
 * barrera: cada página y cada ruta de /api/centro-soporte vuelven a verificar.
 */
export default async function SupportCenterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/centro-soporte");

  const actor = await resolveSupportStaff();
  if (!actor) return <UnauthorizedPanel />;

  // Primera vez: antes de ver nada, elige su nombre de usuario (una sola vez, ver support-profile-service).
  const profile = await getSupportProfile(actor);
  if (profile.required && !profile.locked) {
    return <UsernameSetup fullName={profile.name} suggested={profile.suggested} />;
  }

  // Cuántos tickets esperan sin asignar (el número del riel): una sola consulta agrupada.
  const counts = await getQueueCounts(actor);

  return (
    <Suspense>
      <SupportShell unassigned={counts.sin_asignar} isManager={isManager(actor)} user={session.user} username={profile.username}>
        {children}
      </SupportShell>
    </Suspense>
  );
}
