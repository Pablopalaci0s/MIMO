"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { FavoriteTargetType } from "@mimo/types";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  targetType,
  targetId,
  size = "sm",
  className,
}: {
  targetType: FavoriteTargetType;
  targetId: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(targetType, targetId);

  return (
    <button
      type="button"
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={favorited}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (status !== "authenticated") {
          router.push("/iniciar-sesion");
          return;
        }
        toggle(targetType, targetId);
      }}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95 text-neutral-500 shadow-sm transition-colors hover:text-destructive",
        size === "sm" ? "size-8" : "size-11",
        className,
      )}
    >
      <Heart
        className={cn(size === "sm" ? "size-4" : "size-5", favorited && "fill-destructive text-destructive")}
        strokeWidth={2}
      />
    </button>
  );
}
