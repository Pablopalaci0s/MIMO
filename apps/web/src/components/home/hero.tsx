"use client";

import { ArrowRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const EXAMPLE_PROMPTS = [
  "Cumpleaños de mi novia, presupuesto $30...",
  "Aniversario, algo romántico y con flores...",
  "Quiero pedir perdón, ¿qué le regalo?",
  "Graduación de mi hermana, sorpréndeme...",
];

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((current) => (current + 1) % EXAMPLE_PROMPTS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    router.push(`/ayudame-a-elegir${params}`);
  }

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-16rem] -z-10 flex justify-center blur-3xl"
      >
        <div className="aspect-square w-[44rem] rounded-full bg-gradient-to-br from-brand-soft via-brand-soft/60 to-transparent opacity-90" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24"
      >
        <motion.h1
          variants={item}
          className="text-5xl font-bold tracking-tight text-balance text-neutral-900 sm:text-6xl"
        >
          ¿Qué querés decirle?
        </motion.h1>

        <motion.p variants={item} className="max-w-md text-balance text-base text-neutral-500 sm:text-lg">
          Encontrá el detalle perfecto para esa persona especial.
        </motion.p>

        <motion.form
          variants={item}
          onSubmit={handleSubmit}
          className="mt-2 flex w-full max-w-xl items-center gap-2 rounded-full border border-neutral-200 bg-white p-2 pl-5 shadow-md transition-shadow focus-within:border-neutral-300 focus-within:shadow-lg"
        >
          <Search className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
          <span className="relative h-11 min-w-0 flex-1 overflow-hidden">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-w-0 w-full bg-transparent text-sm text-neutral-900 outline-none sm:text-base"
            />
            {query.length === 0 && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={promptIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-sm text-neutral-400 sm:text-base"
                >
                  {EXAMPLE_PROMPTS[promptIndex]}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0 rounded-full bg-brand text-brand-foreground transition-transform hover:scale-105 hover:bg-brand/90 active:scale-95"
            aria-label="Buscar detalle"
          >
            <ArrowRight className="size-4" />
          </Button>
        </motion.form>

        <motion.a
          variants={item}
          href="/regalos"
          className="text-sm font-medium text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
        >
          O explorá el catálogo completo
        </motion.a>
      </motion.div>
    </section>
  );
}
