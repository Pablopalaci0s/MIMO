"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { getEmotionIcon } from "@/lib/emotion-icons";
import type { OccasionDTO } from "@mimo/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function EmotionGrid({ emotions }: { emotions: OccasionDTO[] }) {
  if (emotions.length === 0) return null;

  return (
    <section className="border-y border-neutral-100 bg-neutral-50/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
          ¿Qué querés transmitir?
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Elegí el sentimiento y te mostramos los regalos ideales.
        </p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {emotions.map((emotion) => {
            const Icon = getEmotionIcon(emotion.slug);
            return (
              <motion.div key={emotion.id} variants={item}>
                <Link
                  href={`/regalos?emocion=${emotion.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-medium text-neutral-800">{emotion.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
