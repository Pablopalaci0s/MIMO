import { Suspense } from "react";
import { VerifyEmailStatus } from "./verify-email-status";

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={null}>
        <VerifyEmailStatus />
      </Suspense>
    </div>
  );
}
