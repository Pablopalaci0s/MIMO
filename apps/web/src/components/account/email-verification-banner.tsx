"use client";

import { Loader2, MailWarning } from "lucide-react";
import { useState } from "react";

export function EmailVerificationBanner() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setLoading(true);
    await fetch("/api/auth/resend-verification", { method: "POST" });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
      <MailWarning className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        {sent ? "Te mandamos un nuevo correo de confirmación." : "Todavía no confirmaste tu correo."}
      </p>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={loading}
          className="shrink-0 text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Reenviar"}
        </button>
      )}
    </div>
  );
}
