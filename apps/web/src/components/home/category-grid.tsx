"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
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
  if (categories.length === 0) return null;

  return (
    <section className="relative min-w-0 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="scrollbar-hide -mx-4 flex snap-x gap-6 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-5 sm:px-0"
        >
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            return (
              <motion.div key={category.id} variants={item} className="shrink-0 snap-start">
                <Link
                  href={`/regalos?categoria=${category.slug}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-all duration-200 group-hover:scale-105 group-hover:bg-neutral-900 group-hover:text-white">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <span className="text-xs font-medium whitespace-nowrap text-neutral-600">
                    {category.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent sm:hidden" />
    </section>
  );
}
