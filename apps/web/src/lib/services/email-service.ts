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
