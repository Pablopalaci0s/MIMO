import { auth } from "@mimo/auth";
import { SupportWidget } from "./support-widget";

/** El widget es un Client Component; la sesión se lee acá, en el servidor,
 * para que sepa desde el primer render si hay una cuenta (sin parpadeo). */
export async function SupportWidgetLoader() {
  const session = await auth();
  return <SupportWidget isLoggedIn={Boolean(session?.user)} userName={session?.user?.name ?? null} />;
}
