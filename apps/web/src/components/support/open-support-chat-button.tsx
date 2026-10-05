"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPEN_SUPPORT_CHAT_EVENT } from "./support-events";

/** Abre el chat flotante desde cualquier parte de la página (ej. /ayuda). */
export function OpenSupportChatButton({ label = "Abrir el chat" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_CHAT_EVENT))}
    >
      <MessageCircle className="size-4" />
      {label}
    </Button>
  );
}
