"use client";

import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { ReportInput, ReportTargetType } from "@mimo/types";

const TARGET_LABEL: Record<ReportTargetType, string> = {
  PRODUCT: "este producto",
  BUSINESS: "este negocio",
  REVIEW: "esta reseña",
  USER: "este usuario",
};

export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      } satisfies ReportInput),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos enviar el reporte."));
      return;
    }
    setSent(true);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTimeout(() => {
            setSent(false);
            setReason("");
            setDescription("");
            setError(null);
          }, 200);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-700">
          <Flag className="size-3.5" /> Reportar
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Reportar {TARGET_LABEL[targetType]}</SheetTitle>
        </SheetHeader>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-neutral-600">Gracias — nuestro equipo va a revisarlo.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-reason">Motivo</Label>
              <Input
                id="report-reason"
                required
                placeholder="Ej. Información falsa, contenido inapropiado..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-description">Detalles (opcional)</Label>
              <Textarea
                id="report-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!sent && (
          <SheetFooter>
            <Button disabled={loading || reason.trim().length < 3} onClick={handleSubmit}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar reporte"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
