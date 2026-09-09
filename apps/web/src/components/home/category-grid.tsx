"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import type { CategoryDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Categorías</h2>
          <p className="mt-1 text-sm text-neutral-500">Explorá por tipo de detalle.</p>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6"
      >
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          return (
            <motion.div key={category.id} variants={item}>
              <Link
                href={`/regalos?categoria=${category.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white px-3 py-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors duration-200 group-hover:bg-neutral-900 group-hover:text-white">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-neutral-700">{category.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
