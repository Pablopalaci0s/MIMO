import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { ImportantDatesManager } from "@/components/account/important-dates-manager";

export const metadata: Metadata = { title: "Fechas importantes" };

export default async function ImportantDatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/perfil/fechas-importantes");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/perfil" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ChevronLeft className="size-4" />
        Mi perfil
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Fechas importantes</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Guardá cumpleaños y aniversarios — te avisamos con tiempo para que no se te pase.
      </p>

      <div className="mt-8">
        <ImportantDatesManager />
      </div>
    </div>
  );
}
