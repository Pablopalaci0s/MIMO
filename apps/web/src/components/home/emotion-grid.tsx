"use client";

import Link from "next/link";
import { getEmotionIcon } from "@/lib/emotion-icons";
import type { OccasionDTO } from "@mimo/types";

export function EmotionGrid({ emotions }: { emotions: OccasionDTO[] }) {
  if (emotions.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6">
      <div className="scrollbar-hide -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
        {emotions.map((emotion) => {
          const Icon = getEmotionIcon(emotion.slug);
          return (
            <Link
              key={emotion.id}
              href={`/regalos?emocion=${emotion.slug}`}
              className="group flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-2 pr-4 pl-3 text-sm font-medium text-neutral-700 transition-colors duration-200 hover:border-brand/50 hover:bg-brand-soft hover:text-brand"
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {emotion.name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
