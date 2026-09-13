import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recolecta MIMO, para qué los usa y cómo protegerlos.",
};

const LAST_UPDATED = "12 de septiembre de 2026";

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
            fecha/horario elegido, cualquier dedicatoria o mensaje que escribas, y el cupón de
            descuento que hayas usado.
          </li>
          <li>
            <strong>Pagos:</strong> si pagás con PayPal, el pago lo procesa PayPal directamente —
            MIMO no ve ni guarda tu número de tarjeta ni tus credenciales de PayPal, solo recibe
            la confirmación de que el cobro se hizo.
          </li>
          <li>
            <strong>Listas de regalos y cabudas:</strong> los productos que agregás a una lista de
            regalos; y si organizás o aportás a una cabuda, tu nombre, el monto que aportaste, y
            el correo de PayPal del organizador (para mandarle lo recaudado).
          </li>
          <li>
            <strong>Reseñas:</strong> el texto y las fotos (hasta 4) que subís al calificar un
            producto.
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
          <li>Juntar aportes para una cabuda y pagarle al organizador cuando la cierra.</li>
          <li>Verificar negocios nuevos y moderar reportes/reseñas.</li>
          <li>Mejorar el catálogo y las recomendaciones que te mostramos.</li>
        </ul>

        <h2>3. Con quién se comparten</h2>
        <p>
          El negocio del que comprás recibe los datos necesarios para preparar y entregar tu
          pedido (nombre y teléfono del destinatario, dirección, dedicatoria). Si pagás con
          PayPal, le compartimos el monto a cobrar, pero nunca tu número de tarjeta ni tus
          credenciales — eso queda entre vos y PayPal, sujeto a su propia política de privacidad.
          MIMO no vende tus datos a terceros ni los comparte con fines publicitarios.
        </p>

        <h2>4. Listas de regalos y cabudas</h2>
        <p>
          Estas funciones son públicas para quien tenga el link, a propósito — es parte de cómo
          funcionan. En una lista de regalos, cualquiera con el link ve si un producto ya fue
          reservado, pero no quién lo reservó (eso solo lo ve el dueño de la lista). En una
          cabuda, cualquiera con el link ve el nombre y el monto de cada persona que aportó — como
          en cualquier colecta o &quot;vaquita&quot;. Si preferís mantener alguna de estas en privado, no
          compartas su link.
        </p>

        <h2>5. Fotos que subís</h2>
        <p>
          Las fotos de perfil, banner o productos que subís (como dueño de negocio), y las fotos
          que agregás a una reseña, se guardan en el servidor de MIMO y son públicas dentro del
          Sitio una vez publicadas — no subas imágenes que no tengas derecho a usar.
        </p>

        <h2>6. Cuánto tiempo se conservan</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si pedís eliminar tu cuenta,
          borramos los datos personales asociados salvo los que debamos conservar por obligación
          legal o para resolver disputas ya abiertas (por ejemplo, el historial de un pedido en
          proceso).
        </p>

        <h2>7. Tus opciones</h2>
        <p>
          Desde &quot;Mi perfil&quot; podés actualizar tus datos de contacto y contraseña en cualquier
          momento. Para pedir la eliminación de tu cuenta o de datos específicos, escribinos
          desde la sección de Ayuda.
        </p>

        <h2>8. Cookies</h2>
        <p>
          Usamos una sola cookie de sesión, necesaria para mantenerte conectado/a a tu cuenta
          entre una página y otra. No es una cookie de rastreo ni de publicidad, no la compartimos
          con terceros, y se borra cuando cerrás sesión o expira. No usamos cookies de análisis ni
          de marketing.
        </p>

        <h2>9. Inteligencia artificial</h2>
        <p>
          Funciones como &quot;Ayúdame a elegir&quot; y el asistente de dedicatorias usan un modelo de
          IA (Claude, de Anthropic) para interpretar lo que escribís (por ejemplo, &quot;cumpleaños de
          mi novia, presupuesto $30&quot;) y sugerirte productos u opciones de mensaje. Le enviamos el
          texto que escribís en ese momento — no tu historial de pedidos ni datos de tu cuenta. La
          IA nunca inventa productos ni precios: solo elige entre lo que ya existe en el catálogo
          de MIMO. Si no hay un proveedor de IA configurado, estas funciones igual funcionan con
          reglas internas en vez de IA.
        </p>

        <h2>10. Seguridad</h2>
        <p>Estas son las medidas concretas que tenemos implementadas hoy para proteger tus datos:</p>
        <ul>
          <li>
            <strong>Contraseñas:</strong> se guardan siempre con hash (bcrypt), nunca en texto
            plano — ni nosotros podemos verlas.
          </li>
          <li>
            <strong>Recuperación de contraseña:</strong> el link que te mandamos usa un código
            aleatorio de un solo uso que vence en 1 hora. Pedir un reset nunca revela si un correo
            está o no registrado en MIMO.
          </li>
          <li>
            <strong>Límite de intentos:</strong> el inicio de sesión, el registro, la recuperación
            de contraseña y otras acciones sensibles tienen un límite de intentos para dificultar
            ataques automatizados.
          </li>
          <li>
            <strong>Validación de datos:</strong> todo lo que se envía a nuestros formularios se
            valida en el servidor antes de guardarse — nunca confiamos en lo que llega desde el
            navegador.
          </li>
          <li>
            <strong>Base de datos:</strong> todas las consultas se hacen a través de un ORM con
            parámetros seguros, nunca armando SQL a mano, lo que evita inyección SQL.
          </li>
          <li>
            <strong>Pagos:</strong> cuando pagás con PayPal, el cobro se procesa siempre del lado
            de PayPal — tu número de tarjeta nunca llega a los servidores de MIMO. El monto a
            cobrar siempre lo recalculamos nosotros en el servidor, nunca confiando en el monto
            que envía el navegador.
          </li>
          <li>
            <strong>Archivos:</strong> las imágenes que subís se validan por tipo y tamaño (máximo
            5MB, solo JPG/PNG/WEBP) antes de guardarse.
          </li>
          <li>
            <strong>Permisos:</strong> cada acción sobre tus pedidos, tu negocio o tu cuenta se
            verifica en el servidor contra quién sos realmente — no alcanza con estar logueado
            para ver o modificar datos de otra cuenta o negocio.
          </li>
          <li>
            <strong>Encabezados de seguridad:</strong> el Sitio usa protecciones estándar del
            navegador (como CSP y HSTS) para reducir el riesgo de ataques comunes como
            clickjacking o inyección de scripts de terceros.
          </li>
          <li>
            <strong>Auditoría interna:</strong> las acciones sensibles que hace nuestro equipo
            desde el panel administrativo (suspender una cuenta, aprobar un negocio, moderar una
            reseña) quedan registradas — quién, qué y cuándo — para poder revisar el uso del panel.
          </li>
          <li>
            <strong>Monitoreo:</strong> usamos Sentry para enterarnos rápido si algo falla en el
            Sitio.
          </li>
        </ul>
        <p>
          Ningún sistema es 100% infalible, así que te recomendamos usar una contraseña única
          para MIMO.
        </p>

        <h2>11. Cambios a esta política</h2>
        <p>
          Si hacemos cambios importantes a esta política, lo vamos a anunciar en el Sitio con
          anticipación razonable.
        </p>
      </div>
    </div>
  );
}
