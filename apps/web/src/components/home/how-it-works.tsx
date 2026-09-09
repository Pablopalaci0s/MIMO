"use client";

import { Heart, MessageCircle, Truck } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Contanos qué querés decir",
    description: "Ocasión, presupuesto y gustos. Nosotros interpretamos el resto.",
  },
  {
    icon: Heart,
    title: "Elegí entre opciones reales",
    description: "Productos disponibles de negocios salvadoreños, con precio y entrega claros.",
  },
  {
    icon: Truck,
    title: "Personalizá y enviá",
    description: "Agregá una dedicatoria, elegí fecha y horario, y listo.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="grid gap-10 sm:grid-cols-3 sm:gap-8"
      >
        {STEPS.map((step, index) => (
          <motion.div key={step.title} variants={item} className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-neutral-900 text-white">
                <step.icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-medium tracking-wide text-neutral-400">
                0{index + 1}
              </span>
            </div>
            <h3 className="font-semibold text-neutral-900">{step.title}</h3>
            <p className="text-sm text-neutral-500">{step.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
