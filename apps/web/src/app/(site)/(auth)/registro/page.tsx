import { oauthProviderStatus } from "@mimo/auth";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-neutral-500">Es gratis y toma un minuto.</p>
      </div>

      <RegisterForm oauthProviders={oauthProviderStatus} />
    </div>
  );
}
