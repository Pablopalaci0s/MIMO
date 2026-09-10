"use client";

import { Check, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GenerateDedicationRequest } from "@mimo/types";

type Tone = GenerateDedicationRequest["tone"];

const TONES: { value: Tone; label: string }[] = [
  { value: "heartfelt", label: "Sincero" },
  { value: "romantic", label: "Romántico" },
  { value: "funny", label: "Divertido" },
  { value: "formal", label: "Formal" },
  { value: "short", label: "Corto" },
];

const QUICK_VARIANTS: { tone: Tone; label: string }[] = [
  { tone: "romantic", label: "Más romántico" },
  { tone: "short", label: "Más corto" },
  { tone: "funny", label: "Más divertido" },
];

export function DedicationAssistant({
  recipientName,
  onSelect,
}: {
  recipientName?: string;
  onSelect: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("heartfelt");
  const [instructions, setInstructions] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function generate(nextTone: Tone) {
    setTone(nextTone);
    setLoading(true);
    setError(null);

    const response = await fetch("/api/dedications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tone: nextTone,
        instructions: instructions.trim() || undefined,
        recipientName: recipientName?.trim() || undefined,
      } satisfies GenerateDedicationRequest),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(body.error?.message ?? "No pudimos generar dedicatorias. Probá de nuevo.");
      return;
    }
    setOptions(body.data.options);
  }

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // Clipboard puede fallar sin permisos — no rompe el flujo, el usuario todavía puede usar "Usar esta".
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        <Sparkles className="size-3.5" />
        Escribime la dedicatoria
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
        <Sparkles className="size-4 text-brand" />
        Asistente de dedicatorias
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TONES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTone(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tone === option.value
                ? "border-brand/50 bg-brand-soft text-brand"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Input
        value={instructions}
        onChange={(event) => setInstructions(event.target.value)}
        placeholder='Ej. "quiero algo romántico pero no demasiado cursi" (opcional)'
        className="bg-white"
      />

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={loading} onClick={() => generate(tone)}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : options.length > 0 ? "Regenerar" : "Generar opciones"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-sm text-neutral-700">{option}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => onSelect(option)}>
                  Usar esta
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(option, index)}>
                  {copiedIndex === index ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedIndex === index ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_VARIANTS.map((variant) => (
              <Button
                key={variant.tone}
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => generate(variant.tone)}
              >
                <RefreshCw className="size-3 text-neutral-400" />
                {variant.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
