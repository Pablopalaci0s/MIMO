import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@mimo/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SupportForm } from "@/components/help/support-form";
import { OpenSupportChatButton } from "@/components/support/open-support-chat-button";
import { HELP_GROUPS } from "@/lib/support/help-content";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Preguntas frecuentes sobre pedidos, entregas, pagos, regalos y negocios en MIMO.",
};

export default async function HelpPage() {
  const session = await auth();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Centro de ayuda</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Las preguntas que más nos hacen. Si no encontrás lo que buscás, escribinos.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {HELP_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              {group.title}
            </h2>
            <Accordion type="single" collapsible>
              {group.items.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
          <MessageCircle className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">¿Seguís con dudas?</p>
          <p className="text-sm text-neutral-500">
            Preguntale al asistente de MIMO — y si hace falta, te pasa con una persona del equipo.
          </p>
        </div>
        <OpenSupportChatButton />
      </div>

      <div className="mt-4">
        <SupportForm defaultName={session?.user?.name ?? ""} defaultEmail={session?.user?.email ?? ""} />
      </div>
    </div>
  );
}
