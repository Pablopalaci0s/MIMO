"use client";

import { Cake, Gift, GraduationCap, Heart, Loader2, PartyPopper, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImportantDateDTO, ImportantDateType } from "@mimo/types";

const TYPE_LABEL: Record<ImportantDateType, string> = {
  ANNIVERSARY: "Aniversario",
  BIRTHDAY: "Cumpleaños",
  MOTHERS_DAY: "Día de la madre",
  FATHERS_DAY: "Día del padre",
  GRADUATION: "Graduación",
  OTHER: "Otra fecha",
};

const TYPE_ICON: Record<ImportantDateType, ReactNode> = {
  ANNIVERSARY: <Heart className="size-4" />,
  BIRTHDAY: <Cake className="size-4" />,
  MOTHERS_DAY: <Sparkles className="size-4" />,
  FATHERS_DAY: <Sparkles className="size-4" />,
  GRADUATION: <GraduationCap className="size-4" />,
  OTHER: <PartyPopper className="size-4" />,
};

const EMPTY_FORM = { type: "BIRTHDAY" as ImportantDateType, label: "", date: "", recipientName: "", remindDaysBefore: "7" };

function daysUntilLabel(daysUntil: number): string {
  if (daysUntil < 0) return "Ya pasó";
  if (daysUntil === 0) return "¡Es hoy!";
  if (daysUntil === 1) return "Mañana";
  return `En ${daysUntil} días`;
}

export function ImportantDatesManager() {
  const [dates, setDates] = useState<ImportantDateDTO[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/perfil/fechas-importantes")
      .then((response) => response.json())
      .then((body) => {
        if (body.success) setDates(body.data);
      });
  }

  useEffect(load, []);

  function startEdit(date: ImportantDateDTO) {
    setEditingId(date.id);
    setForm({
      type: date.type,
      label: date.label,
      date: date.date,
      recipientName: date.recipientName ?? "",
      remindDaysBefore: String(date.remindDaysBefore),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(
      editingId ? `/api/perfil/fechas-importantes/${editingId}` : "/api/perfil/fechas-importantes",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          label: form.label,
          date: form.date,
          recipientName: form.recipientName || undefined,
          remindDaysBefore: form.remindDaysBefore,
        }),
      },
    );
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar la fecha."));
      return;
    }
    cancelEdit();
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/perfil/fechas-importantes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm font-semibold text-neutral-900">
          {editingId ? "Editar fecha" : "Agregar una fecha"}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((f) => ({ ...f, type: value as ImportantDateType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as ImportantDateType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-label">Nombre</Label>
            <Input
              id="date-label"
              required
              placeholder="Ej. Cumpleaños de mamá"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-date">Fecha</Label>
            <Input
              id="date-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-recipient">Para quién es (opcional)</Label>
            <Input
              id="date-recipient"
              placeholder="Ej. Mamá"
              value={form.recipientName}
              onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-remind">Avisarme con cuántos días de antelación</Label>
            <Input
              id="date-remind"
              type="number"
              min={0}
              max={60}
              value={form.remindDaysBefore}
              onChange={(e) => setForm((f) => ({ ...f, remindDaysBefore: e.target.value }))}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="h-10 w-fit px-6">
            {loading ? <Loader2 className="size-4 animate-spin" /> : editingId ? "Guardar cambios" : "Agregar"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {dates === null ? (
        <div className="flex justify-center py-10 text-neutral-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : dates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Gift className="size-8 text-neutral-300" />
          <p className="text-neutral-600">Todavía no agregaste ninguna fecha.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dates.map((date) => (
            <div
              key={date.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                {TYPE_ICON[date.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">{date.label}</p>
                <p className="text-xs text-neutral-500">
                  {TYPE_LABEL[date.type]}
                  {date.recipientName ? ` · ${date.recipientName}` : ""} ·{" "}
                  {new Date(`${date.date}T00:00:00Z`).toLocaleDateString("es-SV", {
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  date.daysUntil >= 0 && date.daysUntil <= date.remindDaysBefore
                    ? "bg-brand-soft text-brand"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {daysUntilLabel(date.daysUntil)}
              </span>
              <button
                onClick={() => startEdit(date)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Editar fecha"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => handleDelete(date.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                aria-label="Eliminar fecha"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
