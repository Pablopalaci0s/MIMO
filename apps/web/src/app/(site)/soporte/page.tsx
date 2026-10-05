import type { Metadata } from "next";
import { auth } from "@mimo/auth";
import { SupportChat } from "@/components/support/support-chat";

export const metadata: Metadata = {
  title: "Soporte",
  description: "Hablá con el asistente de MIMO o con una persona del equipo de soporte.",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SupportPage({ searchParams }: PageProps<"/soporte">) {
  const session = await auth();
  const { c } = await searchParams;
  // El link del correo que le llega a un visitante trae el id de su conversación.
  const initialConversationId = typeof c === "string" && UUID_PATTERN.test(c) ? c : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Soporte</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Preguntale al asistente de MIMO. Si no puede resolverlo, te pasa con una persona del equipo.
      </p>

      <div className="mt-6 h-[calc(100dvh-17rem)] min-h-[30rem] overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-100">
        <SupportChat
          variant="page"
          isLoggedIn={Boolean(session?.user)}
          userName={session?.user?.name ?? null}
          initialConversationId={initialConversationId}
        />
      </div>
    </div>
  );
}
