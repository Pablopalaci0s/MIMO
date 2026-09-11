"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getEmotionIcon } from "@/lib/emotion-icons";
import type { OccasionDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export function EmotionGrid({ emotions }: { emotions: OccasionDTO[] }) {
  if (emotions.length === 0) return null;

  return (
    <section className="relative min-w-0 pt-2 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="scrollbar-hide -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4"
        >
          {emotions.map((emotion) => {
            const Icon = getEmotionIcon(emotion.slug);
            return (
              <motion.div
                key={emotion.id}
                variants={item}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="shrink-0 snap-start"
              >
                <Link
                  href={`/regalos?emocion=${emotion.slug}`}
                  className="group flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-2 pr-4 pl-3 text-sm font-medium whitespace-nowrap text-neutral-700 shadow-sm transition-all duration-200 hover:border-brand/50 hover:bg-brand-soft hover:text-brand hover:shadow-[0_6px_16px_-8px_var(--brand)]"
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  {emotion.name}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
    </section>
  );
}
