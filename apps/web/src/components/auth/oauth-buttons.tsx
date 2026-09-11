"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.6 18.9 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.5-2.1 14.2-5.6l-6.6-5.6c-2 1.5-4.6 2.4-7.6 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.9 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.6 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}

export function OAuthButtons({
  providers,
  callbackUrl,
}: {
  providers: { google: boolean; facebook: boolean };
  callbackUrl?: string;
}) {
  if (!providers.google && !providers.facebook) return null;

  return (
    <div className="flex flex-col gap-3">
      {providers.google && (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => signIn("google", { callbackUrl: callbackUrl ?? "/" })}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>
      )}
      {providers.facebook && (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => signIn("facebook", { callbackUrl: callbackUrl ?? "/" })}
        >
          <FacebookIcon />
          Continuar con Facebook
        </Button>
      )}

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        o con tu correo
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
    </div>
  );
}
