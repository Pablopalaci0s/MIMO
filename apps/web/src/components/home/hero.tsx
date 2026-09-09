"use client";

import { ArrowRight, Gift } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 flex justify-center blur-3xl"
      >
        <div className="aspect-square w-[42rem] rounded-full bg-gradient-to-br from-brand-soft via-brand-soft/60 to-transparent opacity-70" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-4 py-24 text-center sm:py-32"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-500 shadow-xs"
        >
          <Gift className="size-3.5 text-brand" strokeWidth={2.25} />
          Regalos con IA, hechos en El Salvador
        </motion.span>

        <motion.h1
          variants={item}
          className="text-5xl font-semibold tracking-tight text-balance text-neutral-900 sm:text-6xl"
        >
          ¿Qué querés decirle?
        </motion.h1>

        <motion.p variants={item} className="max-w-xl text-lg text-balance text-neutral-500">
          Encontrá el detalle perfecto para esa persona especial.
        </motion.p>

        <motion.div variants={item} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-12 rounded-full bg-brand px-7 text-base font-medium text-brand-foreground shadow-sm transition-transform duration-200 hover:bg-brand/90 active:scale-[0.98]"
            asChild
          >
            <Link href="/ayudame-a-elegir" className="group">
              Ayúdame a elegir
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-full px-7 text-base font-medium transition-transform duration-200 active:scale-[0.98]"
            asChild
          >
            <Link href="/regalos">Explorar regalos</Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
