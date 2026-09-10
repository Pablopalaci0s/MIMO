"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WEEK_DAYS, type BusinessHoursDTO, type WeeklyHours } from "@mimo/types";

const DAY_LABEL: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

export function HoursForm({ initial }: { initial: BusinessHoursDTO }) {
  const [hours, setHours] = useState<WeeklyHours>(initial.openingHours);
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState(String(initial.preparationTimeMinutes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleDay(day: (typeof WEEK_DAYS)[number], open: boolean) {
    setSaved(false);
    setHours((prev) => ({ ...prev, [day]: open ? ["09:00", "18:00"] : null }));
  }

  function setDayTime(day: (typeof WEEK_DAYS)[number], index: 0 | 1, value: string) {
    setSaved(false);
    setHours((prev) => {
      const current = prev[day] ?? ["09:00", "18:00"];
      const next: [string, string] = [...current] as [string, string];
      next[index] = value;
      return { ...prev, [day]: next };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setSaved(false);

    const response = await fetch("/api/negocio/horarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingHours: hours, preparationTimeMinutes: Number(preparationTimeMinutes) }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar los horarios."));
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="prep-time">Tiempo de preparación general (min)</Label>
        <Input
          id="prep-time"
          type="number"
          min="5"
          step="5"
          value={preparationTimeMinutes}
          onChange={(e) => setPreparationTimeMinutes(e.target.value)}
        />
      </div>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {WEEK_DAYS.map((day) => {
          const value = hours[day];
          const isOpen = value !== null;
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 p-4">
              <Switch checked={isOpen} onCheckedChange={(checked) => toggleDay(day, checked)} />
              <span className="w-24 text-sm font-medium text-neutral-900">{DAY_LABEL[day]}</span>
              {isOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    value={value[0]}
                    onChange={(e) => setDayTime(day, 0, e.target.value)}
                  />
                  <span className="text-neutral-400">a</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={value[1]}
                    onChange={(e) => setDayTime(day, 1, e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-sm text-neutral-400">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Horarios guardados.</p>}

      <Button type="submit" disabled={loading} className="h-11 w-fit px-6">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar horarios"}
      </Button>
    </form>
  );
}
