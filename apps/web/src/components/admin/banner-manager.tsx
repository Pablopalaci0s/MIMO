"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminBannerDTO, AdminBannerInput } from "@mimo/types";

function BannerRow({ banner }: { banner: AdminBannerDTO }) {
  const router = useRouter();
  const [title, setTitle] = useState(banner.title);
  const [imageUrl, setImageUrl] = useState(banner.imageUrl);
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl ?? "");
  const [isActive, setIsActive] = useState(banner.isActive);
  const [position, setPosition] = useState(String(banner.position));
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
      position: Number(position),
      ...overrides,
    };
    const response = await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
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
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-3 sm:flex-row">
      <ImageUploadField
        value={imageUrl}
        onChange={(url) => {
          setImageUrl(url);
          void save({ imageUrl: url });
        }}
        aspect="wide"
        className="sm:w-64"
      />

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
        <div className="flex flex-wrap items-center gap-4">
          <Input
            type="number"
            min="0"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            onBlur={() => save()}
            className="w-24"
            placeholder="Orden"
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked);
                void save({ isActive: checked });
              }}
            />
            <span className="text-sm text-neutral-600">{isActive ? "Activo" : "Oculto"}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            aria-label="Eliminar banner"
            className="ml-auto"
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

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4 sm:flex-row">
        <ImageUploadField value={imageUrl} onChange={setImageUrl} aspect="wide" className="sm:w-64" />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm font-medium text-neutral-900">Agregar banner</p>
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
          {banners.map((banner) => (
            <BannerRow key={banner.id} banner={banner} />
          ))}
        </div>
      )}
    </div>
  );
}
