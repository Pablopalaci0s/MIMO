"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import { useHorizontalScroll } from "@/lib/hooks/use-horizontal-scroll";
import { ScrollArrowButton } from "./scroll-arrow-button";
import type { CategoryDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  const { ref, canScrollLeft, canScrollRight, scrollByAmount } = useHorizontalScroll();

  if (categories.length === 0) return null;

  return (
    <section className="relative min-w-0 py-6">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {canScrollLeft && (
          <ScrollArrowButton direction="left" side="left" onClick={() => scrollByAmount("left")} />
        )}
        {canScrollRight && (
          <ScrollArrowButton direction="right" side="right" onClick={() => scrollByAmount("right")} />
        )}
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate="show"
          className="scrollbar-hide -mx-4 flex snap-x gap-6 overflow-x-auto px-4 sm:gap-8"
        >
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            return (
              <motion.div key={category.id} variants={item} className="shrink-0 snap-start">
                <Link
                  href={`/regalos?categoria=${category.slug}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <motion.span
                    whileHover={{ scale: 1.08, rotate: -4 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 shadow-sm ring-0 ring-brand-soft transition-all duration-200 group-hover:bg-neutral-900 group-hover:text-neutral-50 group-hover:ring-4"
                  >
                    <Icon className="size-6" strokeWidth={1.6} />
                  </motion.span>
                  <span className="text-xs font-medium whitespace-nowrap text-neutral-600">
                    {category.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent dark:from-neutral-50" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent dark:from-neutral-50" />
      )}
    </section>
  );
}
