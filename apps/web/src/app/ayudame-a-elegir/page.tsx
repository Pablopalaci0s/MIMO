import type { Metadata } from "next";
import { GiftFinder } from "@/components/gift-finder/gift-finder";

export const metadata: Metadata = {
  title: "Ayúdame a elegir — MIMO",
  description: "Decinos qué querés transmitir y te ayudamos a encontrar el detalle perfecto.",
};

export default async function AyudameAElegirPage({
  searchParams,
}: PageProps<"/ayudame-a-elegir">) {
  const rawParams = await searchParams;
  const q = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">¿Qué querés decirle?</h1>
        <p className="mt-2 text-neutral-500">
          Contanos para quién es, la ocasión y tu presupuesto — buscamos entre los productos reales de MIMO.
        </p>
      </div>

      <GiftFinder initialQuery={q ?? ""} />
    </div>
  );
}
