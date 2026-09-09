import Link from "next/link";
import type { CategoryDTO } from "@mimo/types";

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Categorías</h2>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/regalos?categoria=${category.slug}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-5 text-center transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span className="text-3xl">{category.emoji}</span>
            <span className="text-sm font-medium text-neutral-700">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
