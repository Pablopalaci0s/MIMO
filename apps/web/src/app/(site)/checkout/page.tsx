import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { listMunicipalities } from "@/lib/services/location-service";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/checkout");

  const municipalities = await listMunicipalities();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Checkout</h1>
      <CheckoutForm
        municipalities={municipalities}
        defaultBuyer={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
      />
    </div>
  );
}
