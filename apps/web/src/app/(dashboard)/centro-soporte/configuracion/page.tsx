import { ConfigManager } from "@/components/centro-soporte/config-manager";
import { UnauthorizedPanel } from "@/components/centro-soporte/unauthorized-panel";
import { resolveSupportStaff } from "@/lib/services/support-access-service";
import { listCategories, listMacros } from "@/lib/services/support-config-service";
import { isManager } from "@/lib/support/ticket-rules";

export default async function SupportConfigPage() {
  // Solo supervisión y administración, verificado contra la base en cada carga.
  const actor = await resolveSupportStaff();
  if (!actor || !isManager(actor)) {
    return <UnauthorizedPanel message="La configuración del centro de soporte es solo para supervisores y administradores." />;
  }

  const [categories, macros] = await Promise.all([listCategories({ includeInactive: true }), listMacros({ includeInactive: true })]);

  return (
    <div className="mx-auto flex max-w-[84rem] flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Categorías y respuestas rápidas</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Lo que ven y usan los agentes en la bandeja.</p>
      </div>
      <ConfigManager categories={categories} macros={macros} />
    </div>
  );
}
