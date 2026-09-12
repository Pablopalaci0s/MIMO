import { CalendarHeart, Gift } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReserveGiftButton } from "@/components/gift-registry/reserve-gift-button";
import { getPublicRegistry } from "@/lib/services/gift-registry-service";

export async function generateMetadata({ params }: PageProps<"/listas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const registry = await getPublicRegistry(slug);
  if (!registry) return { title: "Lista no encontrada" };
  return {
    title: registry.title,
    description: `Lista de regalos de ${registry.ownerName} en MIMO.`,
  };
}

export default async function PublicGiftRegistryPage({ params }: PageProps<"/listas/[slug]">) {
  const { slug } = await params;
  const registry = await getPublicRegistry(slug);
  if (!registry) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Gift className="size-8 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{registry.title}</h1>
        <p className="text-sm text-neutral-500">Lista de regalos de {registry.ownerName}</p>
        {registry.eventDate && (
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <CalendarHeart className="size-4" />
            {new Date(registry.eventDate).toLocaleDateString("es-SV", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        )}
        {registry.message && <p className="mt-2 max-w-md text-sm text-neutral-600">{registry.message}</p>}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {registry.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-500">
            Esta lista todavía no tiene regalos.
          </p>
        ) : (
          registry.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${
                item.isReserved ? "border-neutral-100 bg-neutral-50" : "border-neutral-200"
              }`}
            >
              <Link href={`/productos/${item.productSlug}`} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {item.productImageUrl && <Image src={item.productImageUrl} alt="" fill className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/productos/${item.productSlug}`} className="truncate text-sm font-medium text-neutral-900 hover:underline">
                  {item.productName}
                </Link>
                <p className="text-sm text-neutral-500">${item.price.toFixed(2)}</p>
                {item.note && <p className="mt-0.5 text-xs text-neutral-400 italic">&ldquo;{item.note}&rdquo;</p>}
              </div>
              <ReserveGiftButton slug={slug} itemId={item.id} initiallyReserved={item.isReserved} />
            </div>
          ))
        )}
      </div>

      <p className="mt-8 text-center text-xs text-neutral-400">
        Reservar es solo para avisar que vos vas a traer ese regalo — comprálo por el catálogo normal de MIMO como
        cualquier otro producto.
      </p>
    </div>
  );
}
