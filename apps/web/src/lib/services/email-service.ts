/**
 * Envío de correos vía Resend (https://resend.com — tiene plan gratis, no
 * hace falta tarjeta para empezar). Mismo patrón que `AIService` en
 * `packages/ai`: sin la API key, en vez de fallar o fingir que se mandó un
 * correo, se loguea el contenido a consola — así el flujo (recuperar
 * contraseña, verificar correo) se puede probar en desarrollo sin cuenta en
 * Resend, y en producción alguien SÍ va a notar el log si falta configurar
 * la key de verdad.
 *
 * Para activar el envío real: crear una cuenta en resend.com, verificar un
 * dominio (o usar su dominio de pruebas `onboarding@resend.dev` para
 * arrancar), generar una API key, y definir RESEND_API_KEY + EMAIL_FROM en
 * las variables de entorno.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "MIMO <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(
      `[email] RESEND_API_KEY no configurada — no se envía correo real.\n` +
        `  Para: ${input.to}\n  Asunto: ${input.subject}\n  Contenido:\n${input.html}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: input.to, subject: input.subject, html: input.html }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Resend respondió ${response.status} al mandarle a ${input.to}: ${body}`);
  }
}

function emailLayout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">MIMO</h1>
      <h2 style="font-size: 16px; font-weight: 600; margin-top: 24px;">${title}</h2>
      ${bodyHtml}
      <p style="font-size: 12px; color: #a3a3a3; margin-top: 32px;">
        Regalos para hacerle el día a alguien.
      </p>
    </div>
  `;
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Restablecé tu contraseña de MIMO",
    html: emailLayout(
      "Restablecé tu contraseña",
      `
        <p style="font-size: 14px; line-height: 1.5;">
          Pediste restablecer tu contraseña. Tocá el botón de abajo — el link vence en 1 hora.
          Si no fuiste vos, podés ignorar este correo.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 16px; background: #171717; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-size: 14px;">
          Restablecer contraseña
        </a>
      `,
    ),
  };
}

export function buildSupportRequestEmail(
  fromName: string,
  fromEmail: string,
  message: string,
): { subject: string; html: string } {
  return {
    subject: `Consulta de soporte — ${fromName}`,
    html: emailLayout(
      "Nueva consulta desde /ayuda",
      `
        <p style="font-size: 14px; line-height: 1.5;">
          <strong>${escapeHtml(fromName)}</strong> (${escapeHtml(fromEmail)}) escribió:
        </p>
        <p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px;">${escapeHtml(message)}</p>
      `,
    ),
  };
}

export function buildVerifyEmailEmail(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: "Confirmá tu correo en MIMO",
    html: emailLayout(
      "Confirmá tu correo",
      `
        <p style="font-size: 14px; line-height: 1.5;">
          Gracias por crear tu cuenta en MIMO. Confirmá tu correo tocando el botón de abajo — el link vence en 24 horas.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; margin-top: 16px; background: #171717; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-size: 14px;">
          Confirmar correo
        </a>
      `,
    ),
  };
}

/** Todo lo que llega acá puede venir de un usuario (nombre, resumen, mensaje):
 * se escapa antes de armar el HTML, nunca se interpola tal cual. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BUTTON_STYLE =
  "display: inline-block; margin-top: 16px; background: #171717; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-size: 14px;";

/** Aviso al equipo de MIMO: alguien pidió hablar con una persona. */
export function buildSupportEscalationEmail(input: {
  customerName: string;
  customerEmail: string | null;
  reason: string | null;
  summary: string | null;
  adminUrl: string;
  ticketCode?: string;
}): { subject: string; html: string } {
  return {
    subject: `[MIMO soporte${input.ticketCode ? ` ${input.ticketCode}` : ""}] ${input.customerName} pidió hablar con una persona`,
    html: emailLayout(
      "Nueva consulta de soporte",
      `
        <p style="font-size: 14px; line-height: 1.5;">
          <strong>${escapeHtml(input.customerName)}</strong>${input.customerEmail ? ` (${escapeHtml(input.customerEmail)})` : ""}
          pidió hablar con alguien del equipo.
        </p>
        ${input.reason ? `<p style="font-size: 14px; line-height: 1.5;"><strong>Motivo:</strong> ${escapeHtml(input.reason)}</p>` : ""}
        ${input.summary ? `<p style="font-size: 14px; line-height: 1.5; white-space: pre-line;"><strong>Resumen:</strong> ${escapeHtml(input.summary)}</p>` : ""}
        <a href="${input.adminUrl}" style="${BUTTON_STYLE}">Abrir la conversación</a>
      `,
    ),
  };
}

/** Confirmación al cliente de que su consulta quedó registrada como ticket. */
export function buildSupportTicketCreatedEmail(input: {
  customerName: string;
  ticketCode: string;
  subject: string;
  chatUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[${input.ticketCode}] Recibimos tu consulta`,
    html: emailLayout(
      "Recibimos tu consulta",
      `
        <p style="font-size: 14px; line-height: 1.5;">Hola ${escapeHtml(input.customerName)}, una persona del equipo de MIMO ya tiene tu consulta y te va a responder.</p>
        <p style="font-size: 14px; line-height: 1.5;"><strong>Ticket ${escapeHtml(input.ticketCode)}</strong><br />${escapeHtml(input.subject)}</p>
        <a href="${input.chatUrl}" style="${BUTTON_STYLE}">Ver mi consulta</a>
        <p style="font-size: 12px; line-height: 1.5; color: #737373; margin-top: 16px;">
          Por tu seguridad, no compartas contraseñas, códigos de seguridad ni documentos de identidad por este medio.
        </p>
      `,
    ),
  };
}

/** Aviso al cliente de que su ticket se marcó como resuelto (y puede calificar la atención). */
export function buildSupportTicketResolvedEmail(input: {
  customerName: string;
  ticketCode: string;
  chatUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[${input.ticketCode}] Tu consulta se resolvió`,
    html: emailLayout(
      "Tu consulta se resolvió",
      `
        <p style="font-size: 14px; line-height: 1.5;">Hola ${escapeHtml(input.customerName)}, el equipo de MIMO marcó como resuelta tu consulta <strong>${escapeHtml(input.ticketCode)}</strong>.</p>
        <p style="font-size: 14px; line-height: 1.5;">Si todavía necesitás algo, respondé en la misma conversación y la retomamos. Y si querés, contanos cómo fue la atención.</p>
        <a href="${input.chatUrl}" style="${BUTTON_STYLE}">Calificar la atención</a>
      `,
    ),
  };
}

/** Aviso a quien consultó de que soporte le respondió. */
export function buildSupportReplyEmail(input: {
  customerName: string;
  preview: string;
  chatUrl: string;
  /** Código del ticket (ej. "T-1042"), si ya existe. */
  ticketCode?: string;
}): { subject: string; html: string } {
  return {
    subject: input.ticketCode ? `[${input.ticketCode}] El equipo de MIMO te respondió` : "El equipo de MIMO te respondió",
    html: emailLayout(
      "El equipo de MIMO te respondió",
      `
        <p style="font-size: 14px; line-height: 1.5;">Hola ${escapeHtml(input.customerName)}, te respondimos tu consulta:</p>
        <blockquote style="margin: 12px 0; padding: 8px 14px; border-left: 3px solid #e5e5e5; font-size: 14px; line-height: 1.5; white-space: pre-line;">${escapeHtml(input.preview)}</blockquote>
        <a href="${input.chatUrl}" style="${BUTTON_STYLE}">Ver la conversación y responder</a>
      `,
    ),
  };
}
