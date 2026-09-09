import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = {
  title: "Ayúdame a elegir — MIMO",
};

export default function AyudameAElegirPage() {
  return (
    <ComingSoon
      icon={<Sparkles className="size-6" strokeWidth={1.75} />}
      title="Nuestro asistente de regalos está en camino"
      description="Muy pronto vas a poder contarnos qué querés transmitir y te vamos a recomendar el detalle perfecto."
      phase="Fase 7 — IA de recomendaciones"
    />
  );
}
