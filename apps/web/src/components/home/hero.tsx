"use client";

import { ArrowRight, Banknote, Flower2, Gift, Heart, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
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

const TRUST_ITEMS = [
  { icon: Banknote, label: "Pagás contra entrega" },
  { icon: ShieldCheck, label: "Negocios verificados" },
  { icon: Truck, label: "Entrega el mismo día" },
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
      <div
        aria-hidden
        className="pointer-events-none absolute top-16 right-[-6rem] -z-10 blur-3xl sm:right-[-2rem]"
      >
        <div className="aspect-square w-72 rounded-full bg-gradient-to-tr from-amber-100 via-brand-soft/50 to-transparent opacity-70" />
      </div>

      {/* Íconos decorativos flotantes — solo desde sm, opacidad baja para no competir con el contenido */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden sm:block"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } } }}
      >
        {[
          { Icon: Flower2, top: "18%", left: "10%", delay: 0, color: "text-brand/30" },
          { Icon: Gift, top: "68%", left: "14%", delay: 0.6, color: "text-neutral-300" },
          { Icon: Sparkles, top: "22%", left: "88%", delay: 0.3, color: "text-neutral-300" },
          { Icon: Heart, top: "70%", left: "86%", delay: 0.9, color: "text-brand/25" },
        ].map(({ Icon, top, left, delay, color }, index) => (
          <motion.span
            key={index}
            variants={{ hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${color}`}
            style={{ top, left }}
          >
            <motion.span
              animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
              transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut", delay }}
              className="block"
            >
              <Icon className="size-7" strokeWidth={1.5} />
            </motion.span>
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24"
      >
        <motion.a
          variants={item}
          href="/ayudame-a-elegir"
          className="group inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/10 sm:text-sm"
        >
          <Sparkles className="size-3.5 shrink-0" strokeWidth={2} />
          Elegí con ayuda de IA
          <ArrowRight className="size-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <motion.h1
          variants={item}
          className="text-5xl font-bold tracking-tight text-balance text-neutral-900 sm:text-6xl lg:text-7xl"
        >
          ¿Qué querés{" "}
          <span className="relative inline-block whitespace-nowrap">
            decirle
            <motion.svg
              aria-hidden
              viewBox="0 0 120 12"
              className="absolute inset-x-0 -bottom-1.5 h-2.5 w-full text-brand sm:-bottom-2 sm:h-3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.path
                d="M2 8.5C24 2.5 48 2 60 5.5C74 9.5 98 9.5 118 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </motion.svg>
          </span>
          ?
        </motion.h1>

        <motion.p variants={item} className="max-w-md text-balance text-base text-neutral-500 sm:text-lg">
          Encontrá el detalle perfecto para esa persona especial.
        </motion.p>

        <motion.form
          variants={item}
          onSubmit={handleSubmit}
          className="mt-2 flex w-full max-w-xl items-center gap-2 rounded-full border border-neutral-200 bg-white p-2 pl-5 shadow-md transition-all duration-200 focus-within:border-brand/30 focus-within:shadow-[0_0_0_5px_var(--brand-soft),0_12px_28px_-14px_rgba(0,0,0,0.25)]"
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
            variant="brand"
            size="icon"
            className="size-11 shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
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

        <motion.div
          variants={item}
          className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-400 sm:gap-x-6"
        >
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
              {label}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
