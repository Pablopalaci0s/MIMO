import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = {
  title: "Regalos — MIMO",
};

export default function RegalosPage() {
  return (
    <ComingSoon
      emoji="🎁"
      title="El catálogo está en camino"
      description="Muy pronto vas a poder explorar y filtrar todos los regalos disponibles acá."
      phase="Fase 3 — Productos, categorías y negocios"
    />
  );
}
