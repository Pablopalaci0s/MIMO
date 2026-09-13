"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes no sabe qué tema aplicó el usuario hasta montar en el
  // cliente (lee localStorage) — mostrar el switch antes de eso causaría
  // un mismatch de hidratación o un parpadeo del estado incorrecto.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    function markMounted() {
      setMounted(true);
    }
    markMounted();
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-3">
        {isDark ? <Moon className="size-4 text-brand" /> : <Sun className="size-4 text-neutral-400" />}
        <div>
          <p className="text-sm font-medium text-neutral-900">Modo oscuro</p>
          <p className="text-xs text-neutral-500">
            {isDark ? "Activado en este dispositivo." : "Cambiá la apariencia de MIMO a un tema oscuro."}
          </p>
        </div>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        disabled={!mounted}
        aria-label="Cambiar a modo oscuro"
      />
    </div>
  );
}
