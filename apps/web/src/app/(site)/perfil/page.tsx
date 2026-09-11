import { Calendar, ChevronRight, Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@mimo/auth";
import { prisma } from "@mimo/database";
import { EmailVerificationBanner } from "@/components/account/email-verification-banner";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { PushNotificationsToggle } from "@/components/account/push-notifications-toggle";
import { ThemeToggle } from "@/components/account/theme-toggle";
import { Separator } from "@/components/ui/separator";
import type { UserDTO } from "@mimo/types";

export const metadata: Metadata = { title: "Mi perfil — MIMO" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/perfil");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/iniciar-sesion?callbackUrl=/perfil");

  const userDto: UserDTO = {
    ...user,
    emailVerified: user.emailVerified !== null,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Mi perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">Actualizá tus datos de contacto.</p>

      {!userDto.emailVerified && (
        <div className="mt-6">
          <EmailVerificationBanner />
        </div>
      )}

      <div className="mt-8">
        <ProfileForm user={userDto} />
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col gap-3">
        <ThemeToggle />
        <PushNotificationsToggle />
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col gap-2">
        <Link
          href="/perfil/fechas-importantes"
          className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition-colors hover:border-neutral-300"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-neutral-900">
            <Calendar className="size-4 text-neutral-500" />
            Fechas importantes
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        <Link
          href="/favoritos"
          className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition-colors hover:border-neutral-300"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-neutral-900">
            <Heart className="size-4 text-neutral-500" />
            Mis favoritos
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
      </div>

      <Separator className="my-8" />

      <h2 className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">Contraseña</h2>
      <div className="mt-4">
        <PasswordForm />
      </div>
    </div>
  );
}
