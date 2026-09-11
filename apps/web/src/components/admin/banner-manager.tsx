"use client";

import { ChevronDown, ChevronUp, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminBannerDTO, AdminBannerInput } from "@mimo/types";

/** Overlay que simula exactamente cómo se ve el banner en el home (mismo degradé y tipografía que promo-banners.tsx). */
function BannerPreviewOverlay({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3">
      <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow-sm">{title || "Título del banner"}</p>
    </div>
  );
}

function toInput(banner: AdminBannerDTO): AdminBannerInput {
  return {
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    isActive: banner.isActive,
    position: banner.position,
  };
}

async function patchBanner(id: string, input: AdminBannerInput) {
  return fetch(`/api/admin/banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

function BannerRow({
  banner,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  banner: AdminBannerDTO;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(banner.title);
  const [imageUrl, setImageUrl] = useState(banner.imageUrl);
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl ?? "");
  const [isActive, setIsActive] = useState(banner.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(overrides: Partial<AdminBannerInput> = {}) {
    setLoading(true);
    setError(null);
    const input: AdminBannerInput = {
      title,
      imageUrl,
      linkUrl: linkUrl || null,
      isActive,
      position: banner.position,
      ...overrides,
    };
    const response = await patchBanner(banner.id, input);
    const body = await response.json();
    setLoading(false);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar el banner."));
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el banner "${banner.title}"?`)) return;
    setLoading(true);
    await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-neutral-200 p-3 transition-opacity sm:flex-row ${
        isActive ? "" : "opacity-60"
      }`}
    >
      <ImageUploadField
        value={imageUrl}
        onChange={(url) => {
          setImageUrl(url);
          void save({ imageUrl: url });
        }}
        aspect="wide"
        className="sm:w-64"
      >
        <BannerPreviewOverlay title={title} />
      </ImageUploadField>

      <div className="flex flex-1 flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save()} placeholder="Título" />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onBlur={() => save()}
            placeholder="Link (opcional): /regalos o https://..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center overflow-hidden rounded-lg border border-neutral-200">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={!canMoveUp}
              aria-label="Subir orden"
              className="flex size-7 items-center justify-center text-neutral-500 transition-colors enabled:hover:bg-neutral-100 enabled:hover:text-neutral-900 disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <div className="h-4 w-px bg-neutral-200" />
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={!canMoveDown}
              aria-label="Bajar orden"
              className="flex size-7 items-center justify-center text-neutral-500 transition-colors enabled:hover:bg-neutral-100 enabled:hover:text-neutral-900 disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked);
                void save({ isActive: checked });
              }}
            />
            <span
              className={`flex items-center gap-1 text-sm ${isActive ? "text-neutral-600" : "font-medium text-neutral-500"}`}
            >
              {!isActive && <EyeOff className="size-3.5" />}
              {isActive ? "Activo" : "Oculto"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            aria-label="Eliminar banner"
            className="ml-auto text-neutral-400 hover:bg-destructive/10 hover:text-destructive"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function BannerManager({ banners }: { banners: AdminBannerDTO[] }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!imageUrl) {
      setError("Subí una imagen para el banner.");
      return;
    }
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        imageUrl,
        linkUrl: linkUrl || null,
        isActive: true,
        position: banners.length,
      } satisfies AdminBannerInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear el banner."));
      return;
    }
    setTitle("");
    setLinkUrl("");
    setImageUrl(null);
    router.refresh();
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= banners.length) return;
    const current = banners[index];
    const target = banners[swapIndex];
    await Promise.all([
      patchBanner(current.id, { ...toInput(current), position: target.position }),
      patchBanner(target.id, { ...toInput(target), position: current.position }),
    ]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4 sm:flex-row"
      >
        <ImageUploadField value={imageUrl} onChange={setImageUrl} aspect="wide" className="sm:w-64">
          <BannerPreviewOverlay title={title} />
        </ImageUploadField>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Plus className="size-4 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-900">Agregar banner</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="sr-only">Título</Label>
              <Input required placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <Input
              placeholder="Link (opcional): /regalos o https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Crear banner
          </Button>
        </div>
      </form>

      {banners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
          Todavía no hay banners.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {banners.map((banner, index) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              canMoveUp={index > 0}
              canMoveDown={index < banners.length - 1}
              onMove={(direction) => handleMove(index, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
