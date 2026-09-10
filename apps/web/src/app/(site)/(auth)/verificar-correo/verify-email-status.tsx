"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setStatus(body.success ? "success" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Confirmando tu correo...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <p className="text-sm text-neutral-600">Tu correo quedó confirmado.</p>
        <Button asChild className="h-10 w-full">
          <Link href="/perfil">Ir a mi perfil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <XCircle className="size-8 text-destructive" />
      <p className="text-sm text-neutral-600">
        Este link de verificación venció o ya se usó. Pedí uno nuevo desde tu perfil.
      </p>
      <Button asChild variant="outline" className="h-10 w-full">
        <Link href="/perfil">Ir a mi perfil</Link>
      </Button>
    </div>
  );
}
