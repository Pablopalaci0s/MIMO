import { MapPin, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { BusinessSummaryDTO } from "@mimo/types";
import { FavoriteButton } from "./favorite-button";

export function BusinessSummaryCard({ business }: { business: BusinessSummaryDTO }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3 dark:bg-neutral-100">
      <Link href={`/negocios/${business.slug}`} className="flex flex-1 items-center gap-3 overflow-hidden">
        <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900 text-lg font-semibold text-neutral-50">
          {business.logoUrl ? (
            <Image src={business.logoUrl} alt={business.name} fill className="object-cover" />
          ) : (
            business.name[0]
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1 truncate font-medium text-neutral-900">
            {business.name}
            {business.verified && <ShieldCheck className="size-3.5 shrink-0 text-brand" />}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
            {business.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {business.ratingAvg.toFixed(1)}
              </span>
            )}
            {business.municipalityName && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {business.municipalityName}
              </span>
            )}
          </div>
        </div>
      </Link>
      <FavoriteButton
        targetType="BUSINESS"
        targetId={business.id}
        className="static border border-neutral-200 shadow-none hover:border-neutral-300"
      />
    </div>
  );
}
