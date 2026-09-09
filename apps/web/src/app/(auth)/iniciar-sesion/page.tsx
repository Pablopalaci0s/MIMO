import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-neutral-500">Entrá a tu cuenta de MIMO.</p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
