"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminCategoryDTO, AdminCategoryInput } from "@mimo/types";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoryRow({ category }: { category: AdminCategoryDTO }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [emoji, setEmoji] = useState(category.emoji ?? "");
  const [position, setPosition] = useState(String(category.position));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/categorias/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        emoji: emoji || undefined,
        parentId: category.parentId,
        position: Number(position),
      } satisfies AdminCategoryInput),
    });
    const body = await response.json();
    setLoading(false);
    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar la categoría."));
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (category.productCount > 0) return;
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    setLoading(true);
    await fetch(`/api/admin/categorias/${category.id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3">
      <div className="grid gap-2 sm:grid-cols-[3rem_1.5fr_1.5fr_5rem_auto]">
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} onBlur={save} placeholder="🎁" />
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} placeholder="Nombre" />
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={save} placeholder="slug" />
        <Input
          type="number"
          min="0"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          onBlur={save}
          placeholder="Orden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={loading || category.productCount > 0}
          aria-label="Eliminar categoría"
          title={category.productCount > 0 ? "Tiene productos asignados" : "Eliminar"}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
      <p className="text-xs text-neutral-400">{category.productCount} productos</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategoryDTO[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [emoji, setEmoji] = useState("");
  const [position, setPosition] = useState(String(categories.length));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || slugify(name),
        emoji: emoji || undefined,
        position: Number(position),
      } satisfies AdminCategoryInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos crear la categoría."));
      return;
    }
    setName("");
    setSlug("");
    setEmoji("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4">
        <p className="text-sm font-medium text-neutral-900">Agregar categoría</p>
        <div className="grid gap-3 sm:grid-cols-[3rem_1.5fr_1.5fr_5rem_auto]">
          <div className="flex flex-col gap-1">
            <Label className="sr-only">Emoji</Label>
            <Input placeholder="🎁" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <Input
            required
            placeholder="Nombre"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
          />
          <Input placeholder="slug (auto)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input
            type="number"
            min="0"
            placeholder="Orden"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus />}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
          Todavía no hay categorías.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
