import { ChevronLeft, ChevronRight } from "lucide-react";

/** Botón redondo flotante para las tiras horizontales del home — solo
 * visible desde `sm:` (en mobile ya se navega con swipe). */
export function ScrollArrowButton({
  direction,
  side,
  onClick,
}: {
  direction: "left" | "right";
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Ver anteriores" : "Ver siguientes"}
      className={`absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-md transition-all hover:scale-105 hover:text-neutral-900 dark:bg-neutral-100 sm:flex ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  );
}
