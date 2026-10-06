"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api-error-message";
import type { SupportCategoryDTO, SupportMacroDTO, SupportTicketPriority } from "@mimo/types";
import { PRIORITY_LABEL } from "./labels";

const selectClass = "h-8 rounded-md border border-neutral-300 bg-white px-2 text-[13px] text-neutral-900 dark:bg-neutral-100";

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const result = response ? await response.json().catch(() => null) : null;
  return result?.success ? { ok: true } : { ok: false, error: apiErrorMessage(result, "No pudimos guardar el cambio.") };
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-lg border border-neutral-200 bg-white dark:bg-neutral-100">
      <header className="border-b border-neutral-200 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
      </header>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

// ───────────────────────────── categorías ─────────────────────────────

function CategoryRow({ category }: { category: SupportCategoryDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const result = await call(`/api/centro-soporte/categorias/${category.id}`, "PATCH", body);
    setBusy(false);
    if (!result.ok) setError(result.error ?? null);
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-neutral-200 py-2.5 first:border-0 first:pt-0">
      <div className="min-w-40 flex-1">
        <p className={`text-sm font-medium ${category.isActive ? "text-neutral-900" : "text-neutral-400 line-through"}`}>{category.name}</p>
        <p className="font-mono text-[11px] text-neutral-400">{category.slug}</p>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
        Prioridad inicial
        <select
          value={category.defaultPriority}
          disabled={busy}
          onChange={(event) => void update({ defaultPriority: event.target.value })}
          className={selectClass}
          aria-label={`Prioridad inicial de ${category.name}`}
        >
          {(Object.keys(PRIORITY_LABEL) as SupportTicketPriority[]).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABEL[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Switch checked={category.isActive} disabled={busy} onCheckedChange={(checked) => void update({ isActive: checked })} aria-label={`Activar ${category.name}`} />
        Activa
      </label>
      {busy && <Loader2 className="size-4 animate-spin text-neutral-400" />}
      {error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await call("/api/centro-soporte/categorias", "POST", { name, defaultPriority: priority, isActive: true, position: 100 });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? null);
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-neutral-500">
        Nueva categoría
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Facturación" maxLength={60} required />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Prioridad inicial
        <select value={priority} onChange={(event) => setPriority(event.target.value as SupportTicketPriority)} className={selectClass}>
          {(Object.keys(PRIORITY_LABEL) as SupportTicketPriority[]).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABEL[value]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={busy || name.trim().length < 2}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

// ───────────────────────────── macros ─────────────────────────────

function MacroRow({ macro }: { macro: SupportMacroDTO }) {
  const router = useRouter();
  const [title, setTitle] = useState(macro.title);
  const [body, setBody] = useState(macro.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = title !== macro.title || body !== macro.body;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setError(result.error ?? null);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 border-t border-neutral-200 py-3 first:border-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} aria-label="Título de la respuesta" className="font-medium" />
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
          <Switch
            checked={macro.isActive}
            disabled={busy}
            onCheckedChange={(checked) => void run(() => call(`/api/centro-soporte/macros/${macro.id}`, "PATCH", { isActive: checked }))}
            aria-label={`Activar ${macro.title}`}
          />
          Activa
        </label>
        <button
          type="button"
          onClick={() => void run(() => call(`/api/centro-soporte/macros/${macro.id}`, "DELETE"))}
          disabled={busy}
          aria-label={`Eliminar ${macro.title}`}
          className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={2000} aria-label="Texto de la respuesta" />
      {dirty && (
        <div>
          <Button type="button" size="sm" disabled={busy || title.trim().length < 2 || body.trim().length < 2} onClick={() => void run(() => call(`/api/centro-soporte/macros/${macro.id}`, "PATCH", { title, body }))}>
            Guardar cambios
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function NewMacroForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await call("/api/centro-soporte/macros", "POST", { title, body, isActive: true });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? null);
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
      <p className="text-xs text-neutral-500">
        Nueva respuesta rápida. Podés usar <code className="rounded bg-neutral-100 px-1">{"{cliente}"}</code> (nombre de pila) y{" "}
        <code className="rounded bg-neutral-100 px-1">{"{ticket}"}</code> (código). El agente la inserta, la edita y la envía él mismo: nunca se manda sola.
      </p>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título (ej. Estamos revisando tu pedido)" maxLength={80} required />
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={2000} placeholder="Hola {cliente}, estamos revisando tu pedido y nos pondremos en contacto contigo." required />
      <div>
        <Button type="submit" disabled={busy || title.trim().length < 2 || body.trim().length < 2}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar respuesta
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function ConfigManager({ categories, macros }: { categories: SupportCategoryDTO[]; macros: SupportMacroDTO[] }) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card title="Categorías de ticket" hint="Se pueden agregar y desactivar sin tocar código. La prioridad inicial la fija el sistema a partir de la categoría; el cliente nunca la elige.">
        <ul>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
        <NewCategoryForm />
      </Card>
      <Card title="Respuestas rápidas" hint="Texto que el agente puede insertar en una respuesta. Se puede editar antes de enviar.">
        {macros.length === 0 ? <p className="text-sm text-neutral-400">Todavía no hay respuestas rápidas.</p> : (
          <ul>
            {macros.map((macro) => (
              <MacroRow key={macro.id} macro={macro} />
            ))}
          </ul>
        )}
        <NewMacroForm />
      </Card>
    </div>
  );
}
