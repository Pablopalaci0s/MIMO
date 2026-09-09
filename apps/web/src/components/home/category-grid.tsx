"use client";

import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import type { CategoryDTO } from "@mimo/types";

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div
        className="scrollbar-hide -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0"
      >
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          return (
            <Link
              key={category.id}
              href={`/regalos?categoria=${category.slug}`}
              className="group flex shrink-0 snap-start flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors duration-200 group-hover:bg-neutral-900 group-hover:text-white">
                <Icon className="size-5" strokeWidth={1.6} />
              </span>
              <span className="max-w-16 text-center text-xs leading-tight font-medium text-neutral-600">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
