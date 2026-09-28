import type { SupportRequestInput } from "@mimo/validation";
import { buildSupportRequestEmail, sendEmail } from "./email-service";

/** Sin `SUPPORT_EMAIL` configurada, cae al mismo remitente de pruebas que
 * el resto del envío de correos (`EMAIL_FROM`/onboarding@resend.dev) —
 * mismo criterio que `email-service`: nunca falla en dev por falta de
 * config, y en producción alguien va a notar que las consultas no llegan
 * a ningún lado si no se define de verdad. */
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "soporte@mimo.sv";

export async function sendSupportRequest(input: SupportRequestInput): Promise<void> {
  const { subject, html } = buildSupportRequestEmail(input.name, input.email, input.message);
  await sendEmail({ to: SUPPORT_EMAIL, subject, html });
}
