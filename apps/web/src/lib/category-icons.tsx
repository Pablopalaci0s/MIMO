import {
  Cake,
  Candy,
  Coffee,
  Diamond,
  Flower2,
  Gift,
  IceCreamCone,
  type LucideIcon,
  Mail,
  PartyPopper,
  PawPrint,
  Sparkles,
  Wand2,
} from "lucide-react";

/**
 * Un ícono consistente por categoría en lugar de emoji — los emoji se
 * mantienen en la base de datos (para notificaciones, WhatsApp, etc.) pero
 * la interfaz usa un sistema de íconos propio para verse más pulida y
 * uniforme entre plataformas.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  flores: Flower2,
  chocolates: Candy,
  peluches: PawPrint,
  globos: PartyPopper,
  cartas: Mail,
  "cajas-de-regalo": Gift,
  pasteles: Cake,
  postres: IceCreamCone,
  "desayunos-sorpresa": Coffee,
  personalizados: Wand2,
  propuestas: Diamond,
  celebraciones: Sparkles,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? Gift;
}
