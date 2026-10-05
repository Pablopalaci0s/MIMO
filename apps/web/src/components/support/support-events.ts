export const OPEN_SUPPORT_CHAT_EVENT = "mimo:open-support-chat";

/** Qué conversación tiene guardada este navegador (visitantes sin cuenta). */
export const CONVERSATION_STORAGE_KEY = "mimo.support.conversationId";
/** Hasta qué mensaje ya vio la persona — para el punto de "mensaje nuevo". */
export const LAST_SEEN_STORAGE_KEY = "mimo.support.lastSeen";

/** localStorage puede tirar (modo privado, datos de sitio bloqueados): el chat
 * funciona igual, solo que sin recordar la conversación entre visitas. */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento disponible */
  }
}
