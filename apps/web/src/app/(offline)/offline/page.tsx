"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <WifiOff className="size-6" />
      </span>
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Sin conexión</h1>
        <p className="mt-1 max-w-xs text-sm text-neutral-500">
          No pudimos cargar esta página. Revisá tu conexión a internet e intentá de nuevo.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
      >
        Reintentar
      </button>
    </div>
  );
}
