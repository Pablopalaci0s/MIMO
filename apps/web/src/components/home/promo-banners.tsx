"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { BannerDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function PromoBanners({ banners }: { banners: BannerDTO[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="relative min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {banners.map((banner) => {
            const isInternal = banner.linkUrl?.startsWith("/");
            const content = (
              <div className="group relative aspect-[2.4/1] w-[85vw] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-100 sm:w-full">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 640px) 85vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                <p className="absolute bottom-4 left-4 max-w-[80%] text-lg font-semibold text-white drop-shadow-sm sm:text-xl">
                  {banner.title}
                </p>
              </div>
            );

            if (!banner.linkUrl) {
              return (
                <motion.div key={banner.id} variants={item} className="sm:flex-1">
                  {content}
                </motion.div>
              );
            }

            return (
              <motion.div key={banner.id} variants={item} className="sm:flex-1">
                {isInternal ? (
                  <Link href={banner.linkUrl}>{content}</Link>
                ) : (
                  <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
