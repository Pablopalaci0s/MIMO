"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "cn";
import { apiErrorMessage } from "@/lib/api-error-message";

export function ImageUploadField({
  value,
  onChange,
  onRemove,
  className,
  aspect = "square",
}: {
  value: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  aspect?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: formData });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos subir la imagen."));
      return;
    }
    onChange(body.data.url);
  }

  return (
    <div className={cn("flex flex-col gap-1", aspect === "wide" ? "w-full" : "w-28")}>
      <div
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50",
          aspect === "wide" ? "aspect-[16/5] w-full" : "size-28",
          className,
        )}
      >
        {value && <Image src={value} alt="" fill className="object-cover" />}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 transition-colors hover:text-neutral-600",
            value && "bg-black/0 text-transparent opacity-0 hover:bg-black/40 hover:text-white hover:opacity-100",
          )}
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-[11px] font-medium">{value ? "Cambiar" : "Subir foto"}</span>
        </button>

        {value && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar imagen"
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="size-3" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
