import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-neutral-500">Elegí una contraseña nueva para tu cuenta.</p>
      </div>

      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
