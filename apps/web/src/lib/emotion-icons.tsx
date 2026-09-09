import {
  Award,
  Gift,
  HandHeart,
  Heart,
  HeartCrack,
  type LucideIcon,
  MessageCircleHeart,
  PartyPopper,
  Sparkles,
} from "lucide-react";

export const EMOTION_ICONS: Record<string, LucideIcon> = {
  "te-amo": Heart,
  "te-extrano": MessageCircleHeart,
  gracias: HandHeart,
  perdon: HeartCrack,
  felicidades: PartyPopper,
  "estoy-orgulloso-de-vos": Award,
  "quiero-sorprenderte": Gift,
  "pense-en-vos": Sparkles,
};

export function getEmotionIcon(slug: string): LucideIcon {
  return EMOTION_ICONS[slug] ?? Heart;
}
