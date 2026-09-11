"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (banners.length === 0) return null;

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const itemWidth = track.scrollWidth / banners.length;
    const index = Math.round(track.scrollLeft / itemWidth);
    setActiveIndex(Math.min(banners.length - 1, Math.max(0, index)));
  }

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const itemWidth = track.scrollWidth / banners.length;
    track.scrollTo({ left: itemWidth * index, behavior: "smooth" });
  }

  return (
    <section className="relative min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          ref={trackRef}
          onScroll={handleScroll}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {banners.map((banner) => {
            const isInternal = banner.linkUrl?.startsWith("/");
            const content = (
              <div className="group relative aspect-[2.4/1] w-[85vw] shrink-0 snap-start overflow-hidden rounded-3xl bg-neutral-100 ring-1 ring-black/5 transition-all duration-300 hover:ring-brand/20 sm:w-full">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 640px) 85vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <p className="max-w-[80%] text-lg font-semibold text-white drop-shadow-sm sm:text-xl">
                    {banner.title}
                  </p>
                  {banner.linkUrl && (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 sm:size-9">
                      <ArrowUpRight className="size-4" strokeWidth={2.25} />
                    </span>
                  )}
                </div>
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

        {banners.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Ir a la promoción ${index + 1}`}
                onClick={() => scrollToIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-5 bg-brand" : "w-1.5 bg-neutral-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
