import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Estado "sin permiso": se muestra en vez de los datos, nunca junto a ellos. */
export function UnauthorizedPanel({ message }: { message?: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Lock className="size-8 text-neutral-300" />
      <h1 className="text-xl font-semibold text-neutral-900">No tenés acceso a esta sección</h1>
      <p className="text-sm text-neutral-500">
        {message ?? "El centro de soporte es solo para el equipo de soporte de MIMO. Si creés que deberías tener acceso, pedile a un administrador que te asigne el rol."}
      </p>
      <Button variant="outline" asChild className="mt-2">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
