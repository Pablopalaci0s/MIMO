"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProductRowActions({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    await fetch(`/api/negocio/productos/${productId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/negocio/productos/${productId}/editar`} aria-label={`Editar ${productName}`}>
          <Pencil />
        </Link>
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={loading} aria-label={`Eliminar ${productName}`}>
        {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
