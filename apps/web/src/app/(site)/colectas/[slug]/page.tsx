import { PartyPopper, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributeForm } from "@/components/group-gift/contribute-form";
import { getPublicGroupGift } from "@/lib/services/group-gift-service";

export async function generateMetadata({ params }: PageProps<"/colectas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const gift = await getPublicGroupGift(slug);
  if (!gift) return { title: "Colecta no encontrada" };
  return {
    title: gift.title,
    description: `Colecta para regalarle ${gift.productName} — organizada por ${gift.organizerName} en MIMO.`,
  };
}

export default async function PublicGroupGiftPage({ params }: PageProps<"/colectas/[slug]">) {
  const { slug } = await params;
  const gift = await getPublicGroupGift(slug);
  if (!gift) notFound();

  const progress = Math.min(100, Math.round((gift.collectedAmount / gift.targetAmount) * 100));
  const remaining = Math.max(0, gift.targetAmount - gift.collectedAmount);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <PartyPopper className="size-8 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{gift.title}</h1>
        <p className="text-sm text-neutral-500">Colecta organizada por {gift.organizerName}</p>
        {gift.message && <p className="mt-2 max-w-md text-sm text-neutral-600">{gift.message}</p>}
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-neutral-200 p-4">
        <Link href={`/productos/${gift.productSlug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {gift.productImageUrl && <Image src={gift.productImageUrl} alt="" fill className="object-cover" />}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-400">El regalo</p>
          <Link href={`/productos/${gift.productSlug}`} className="font-medium text-neutral-900 hover:underline">
            {gift.productName}
          </Link>
        </div>
      </div>

      {gift.status !== "OPEN" && (
        <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-center text-sm text-neutral-600">
          {gift.status === "COMPLETED" ? "Esta colecta ya se completó — ¡gracias a todos!" : "Esta colecta se canceló."}
        </p>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold text-neutral-900">${gift.collectedAmount.toFixed(2)}</p>
          <p className="text-sm text-neutral-500">de ${gift.targetAmount.toFixed(2)}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        {gift.status === "OPEN" && remaining > 0 && (
          <p className="mt-1 text-xs text-neutral-400">Faltan ${remaining.toFixed(2)} para llegar a la meta.</p>
        )}
      </div>

      {gift.status === "OPEN" && (
        <div className="mt-6">
          <ContributeForm slug={slug} suggestedAmount={Math.min(remaining, gift.targetAmount) || gift.targetAmount} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-neutral-400 uppercase">
          <Users className="size-3.5" /> Aportaron ({gift.contributions.length})
        </h2>
        {gift.contributions.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavía nadie aportó — ¡sé el primero!</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {gift.contributions.map((contribution) => (
              <div key={contribution.id} className="flex justify-between text-sm text-neutral-600">
                <span>{contribution.contributorName}</span>
                <span className="font-medium text-neutral-900">${contribution.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
