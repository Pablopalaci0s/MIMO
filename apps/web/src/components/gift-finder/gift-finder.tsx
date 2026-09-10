"use client";

import {
  BookOpen,
  Dumbbell,
  Gamepad2,
  Heart,
  Laugh,
  Loader2,
  Music,
  Palette,
  Search,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "./recommendation-card";
import type { RecommendGiftsResponse } from "@mimo/types";

const PERSONALITIES = [
  { value: "romántica", label: "Romántica", icon: Heart },
  { value: "divertida", label: "Divertida", icon: Laugh },
  { value: "gamer", label: "Gamer", icon: Gamepad2 },
  { value: "deportista", label: "Deportista", icon: Dumbbell },
  { value: "creativa", label: "Creativa", icon: Palette },
  { value: "beauty", label: "Beauty", icon: Sparkles },
  { value: "foodie", label: "Foodie", icon: UtensilsCrossed },
  { value: "amante de libros", label: "Le gusta leer", icon: BookOpen },
  { value: "música", label: "Le gusta la música", icon: Music },
];

function createSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GiftFinder({ initialQuery = "" }: { initialQuery?: string }) {
  const [message, setMessage] = useState(initialQuery);
  const [personality, setPersonality] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendGiftsResponse | null>(null);
  const sessionId = useRef(createSessionId());
  const autoSubmitted = useRef(false);

  async function runSearch(text: string, selectedPersonality: string[]) {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        personality: selectedPersonality.length ? selectedPersonality : undefined,
        sessionId: sessionId.current,
      }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(body.error?.message ?? "No pudimos buscar recomendaciones. Probá de nuevo.");
      return;
    }
    setResult(body.data);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 3) {
      setError("Contanos un poco más para poder ayudarte.");
      return;
    }
    void runSearch(message, personality);
  }

  useEffect(() => {
    if (initialQuery.trim().length >= 3 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void runSearch(initialQuery, []);
    }
  }, [initialQuery]);

  function togglePersonality(value: string) {
    setPersonality((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex w-full items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 pl-5 shadow-sm transition-shadow focus-within:border-neutral-300 focus-within:shadow-md">
          <Search className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Cumpleaños de mi novia, 23 años, le gustan las flores y tengo $35..."
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-10 shrink-0 rounded-full bg-brand px-5 text-brand-foreground hover:bg-brand/90"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Encontrar"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">
            ¿Cómo es esa persona? (opcional)
          </p>
          <div className="flex flex-wrap gap-2">
            {PERSONALITIES.map((option) => {
              const Icon = option.icon;
              const selected = personality.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => togglePersonality(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-brand/50 bg-brand-soft text-brand"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
                  )}
                >
                  <Icon className="size-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {!loading && result && (
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900">
            <Heart className="size-5 fill-brand text-brand" />
            Encontramos estas opciones para vos
          </h2>
          {result.recommendations.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Todavía no tenemos productos que combinen bien con eso — probá explorando el catálogo completo.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {result.recommendations.map((recommendation, index) => (
                <RecommendationCard key={recommendation.product.id} recommendation={recommendation} position={index + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
