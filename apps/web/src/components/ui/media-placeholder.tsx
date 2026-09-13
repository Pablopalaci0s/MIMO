import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/**
 * Estado "sin foto" para productos/negocios sin imagen real — un ícono de
 * categoría sobre el degradé de marca, en vez de simular una foto que no
 * existe (placeholder de placehold.co, foto de stock genérica, etc.). Se
 * usa dentro del mismo contenedor `relative aspect-... overflow-hidden`
 * donde iría el <Image>, llenándolo por completo.
 */
export function MediaPlaceholder({
  icon: Icon,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-gradient-to-br from-brand-soft to-neutral-100",
        className,
      )}
    >
      <Icon className={cn("size-10 text-brand/35", iconClassName)} strokeWidth={1.25} />
    </div>
  );
}
