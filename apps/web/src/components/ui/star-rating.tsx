"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "default",
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "default";
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;
  const starSize = size === "sm" ? "size-4" : "size-6";

  return (
    <div className={cn("flex items-center gap-0.5", !readOnly && "cursor-pointer")}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={cn("disabled:cursor-default", !readOnly && "transition-transform hover:scale-110")}
        >
          <Star
            className={cn(
              starSize,
              star <= displayValue ? "fill-amber-400 text-amber-400" : "fill-neutral-100 text-neutral-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
