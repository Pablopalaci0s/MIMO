import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recolecta MIMO, para qué los usa y cómo protegerlos.",
};

const LAST_UPDATED = "11 de septiembre de 2026";

export default function PrivacidadPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Política de privacidad</h1>
      <p className="mt-1 text-sm text-neutral-500">Última actualización: {LAST_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-4 text-sm [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-neutral-900 [&>p]:leading-relaxed [&>p]:text-neutral-600 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-neutral-600">
        <p>
          Esta política explica qué datos recolecta MIMO cuando usás el Sitio, para qué los
          usamos, y qué opciones tenés sobre ellos.
        </p>

        <h2>1. Qué datos recolectamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> nombre, correo, teléfono y contraseña (guardada siempre
            encriptada, nunca en texto plano).
          </li>
          <li>
            <strong>Pedidos:</strong> nombre y teléfono del destinatario, dirección de entrega,
            fecha/horario elegido, y cualquier dedicatoria o mensaje que escribas.
          </li>
          <li>
            <strong>Negocios:</strong> datos del negocio (nombre, dirección, teléfono, redes) y
            de su dueño/a, para verificarlo y mostrarlo en el catálogo.
          </li>
          <li>
            <strong>Uso del Sitio:</strong> qué páginas visitás y qué acciones hacés (favoritos,
            reseñas, notificaciones), para que la app funcione — no usamos rastreo publicitario
            de terceros.
          </li>
        </ul>

        <h2>2. Para qué los usamos</h2>
        <ul>
          <li>Procesar y entregar tus pedidos, y comunicárselos al negocio correspondiente.</li>
          <li>Mostrarte el estado de tus pedidos y avisarte de novedades (notificaciones dentro de la app).</li>
          <li>Verificar negocios nuevos y moderar reportes/reseñas.</li>
          <li>Mejorar el catálogo y las recomendaciones que te mostramos.</li>
        </ul>

        <h2>3. Con quién se comparten</h2>
        <p>
          El negocio del que comprás recibe los datos necesarios para preparar y entregar tu
          pedido (nombre y teléfono del destinatario, dirección, dedicatoria). MIMO no vende tus
          datos a terceros ni los comparte con fines publicitarios. Si en el futuro se integra un
          proveedor de pago (hoy solo aceptamos efectivo contra entrega), esta política se
          actualizará para reflejar qué datos procesa ese proveedor.
        </p>

        <h2>4. Fotos que subís</h2>
        <p>
          Las fotos de perfil, banner o productos que subís (como dueño de negocio) se guardan en
          el servidor de MIMO y son públicas dentro del Sitio una vez publicadas — no subas
          imágenes que no tengas derecho a usar.
        </p>

        <h2>5. Cuánto tiempo se conservan</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si pedís eliminar tu cuenta,
          borramos los datos personales asociados salvo los que debamos conservar por obligación
          legal o para resolver disputas ya abiertas (por ejemplo, el historial de un pedido en
          proceso).
        </p>

        <h2>6. Tus opciones</h2>
        <p>
          Desde &quot;Mi perfil&quot; podés actualizar tus datos de contacto y contraseña en cualquier
          momento. Para pedir la eliminación de tu cuenta o de datos específicos, escribinos
          desde la sección de Ayuda.
        </p>

        <h2>7. Cookies</h2>
        <p>
          Usamos una sola cookie de sesión, necesaria para mantenerte conectado/a a tu cuenta
          entre una página y otra. No es una cookie de rastreo ni de publicidad, no la compartimos
          con terceros, y se borra cuando cerrás sesión o expira. No usamos cookies de análisis ni
          de marketing.
        </p>

        <h2>8. Inteligencia artificial</h2>
        <p>
          Funciones como &quot;Ayúdame a elegir&quot; y el asistente de dedicatorias usan un modelo de
          IA (Claude, de Anthropic) para interpretar lo que escribís (por ejemplo, &quot;cumpleaños de
          mi novia, presupuesto $30&quot;) y sugerirte productos u opciones de mensaje. Le enviamos el
          texto que escribís en ese momento — no tu historial de pedidos ni datos de tu cuenta. La
          IA nunca inventa productos ni precios: solo elige entre lo que ya existe en el catálogo
          de MIMO. Si no hay un proveedor de IA configurado, estas funciones igual funcionan con
          reglas internas en vez de IA.
        </p>

        <h2>9. Seguridad</h2>
        <p>
          Las contraseñas se guardan con hash (nunca en texto plano) y las conexiones al Sitio
          usan HTTPS. Ningún sistema es 100% infalible, así que te recomendamos usar una
          contraseña única para MIMO.
        </p>

        <h2>10. Cambios a esta política</h2>
        <p>
          Si hacemos cambios importantes a esta política, lo vamos a anunciar en el Sitio con
          anticipación razonable.
        </p>
      </div>
    </div>
  );
}
