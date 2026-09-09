"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  icon,
  title,
  description,
  phase,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        {icon}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <p className="text-neutral-500">{description}</p>
      <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{phase}</p>
      <Button variant="outline" className="mt-2" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </motion.div>
  );
}
