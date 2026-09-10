"use client";

import { ShieldCheck, Star, Truck } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedBusinessDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function FeaturedBusinesses({ businesses }: { businesses: FeaturedBusinessDTO[] }) {
  if (businesses.length === 0) return null;

  return (
    <section className="relative min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">Negocios destacados</h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3"
        >
          {businesses.map((business) => (
            <motion.div key={business.id} variants={item} className="w-64 shrink-0 snap-start sm:w-auto">
              <Link
                href={`/negocios/${business.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.18)]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-soft to-neutral-100">
                  {business.previewImageUrl && (
                    <Image
                      src={business.previewImageUrl}
                      alt={business.name}
                      fill
                      sizes="(max-width: 640px) 256px, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {business.verified && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
                      <ShieldCheck className="size-3 text-brand" strokeWidth={2} />
                      Verificado
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                  <p className="line-clamp-1 font-medium text-neutral-900">{business.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    {business.ratingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {business.ratingAvg.toFixed(1)}
                        <span className="text-neutral-400">({business.ratingCount})</span>
                      </span>
                    )}
                    {business.deliveryFee !== null && (
                      <span className="flex items-center gap-1">
                        <Truck className="size-3.5" />
                        ${business.deliveryFee.toFixed(2)}
                        {business.estimatedMinutes ? ` · ${business.estimatedMinutes} min` : ""}
                      </span>
                    )}
                  </div>
                  {business.municipalityName && (
                    <p className="text-xs text-neutral-400">{business.municipalityName}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
