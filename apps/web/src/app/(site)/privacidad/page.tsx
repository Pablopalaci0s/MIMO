import Link from "next/link";
import type { Metadata } from "next";
import {
  DOCUMENT_PURPOSE_STATEMENT,
  DOCUMENT_RETENTION_CLOSED_DAYS,
  DOCUMENT_RETENTION_REJECTED_DAYS,
  PRIVACY_POLICY_UPDATED,
  PRIVACY_POLICY_VERSION,
} from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recolecta MIMO, para qué los usa y cómo protegerlos.",
};


export default function PrivacidadPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Política de privacidad</h1>
      <p className="mt-1 text-sm text-neutral-500">Versión {PRIVACY_POLICY_VERSION} · Última actualización: {PRIVACY_POLICY_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-4 text-sm [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-neutral-900 [&>p]:leading-relaxed [&>p]:text-neutral-600 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-neutral-600">
        <p>
          Esta política explica qué datos recolecta MIMO cuando usás el Sitio, para qué los
          usamos, y qué opciones tenés sobre ellos. Si buscás el detalle técnico de cómo
          protegemos esos datos, es la página de{" "}
          <Link href="/seguridad" className="underline">
            Seguridad
          </Link>
          .
        </p>

        <h2>1. Qué información recopilamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> nombre, correo, teléfono y contraseña (guardada siempre
            con hash, nunca en texto plano).
          </li>
          <li>
            <strong>Pedidos:</strong> nombre y teléfono del destinatario, dirección de entrega,
            fecha/horario elegido, cualquier dedicatoria o mensaje que escribas, y el cupón de
            descuento que hayas usado.
          </li>
          <li>
            <strong>Listas de regalos y cabudas:</strong> los productos que agregás a una lista
            de regalos; y si organizás o aportás a una cabuda, tu nombre, el monto que aportaste,
            y el correo de PayPal del organizador (para mandarle lo recaudado).
          </li>
          <li>
            <strong>Reseñas:</strong> el texto y las fotos (hasta 4) que subís al calificar un
            producto.
          </li>
          <li>
            <strong>Negocios:</strong> datos del negocio (nombre, dirección, teléfono, redes) y
            de su dueño/a, para verificarlo y mostrarlo en el catálogo, además de las fotos de
            perfil, banner o productos que suba.
          </li>
          <li>
            <strong>Documentos de verificación de negocios:</strong> la foto del DUI (frente y
            reverso) y una foto del titular sosteniendo su DUI, y opcionalmente NIT/NRC y permisos.
            Ver la sección 7.
          </li>
          <li>
            <strong>Datos técnicos y de uso:</strong> qué páginas visitás y qué acciones hacés
            (favoritos, reseñas, notificaciones), para que la app funcione — no usamos rastreo
            publicitario de terceros. Ver también la sección de Cookies más abajo.
          </li>
        </ul>

        <h2>2. Cómo usamos la información</h2>
        <ul>
          <li>Procesar y entregar tus pedidos, y comunicárselos al negocio correspondiente.</li>
          <li>Mostrarte el estado de tus pedidos y avisarte de novedades (notificaciones dentro de la app).</li>
          <li>Juntar aportes para una cabuda y pagarle al organizador cuando la cierra.</li>
          <li>Verificar la identidad del titular y la legitimidad de los negocios nuevos, y moderar reportes/reseñas.</li>
          <li>Mejorar el catálogo y las recomendaciones que te mostramos.</li>
        </ul>

        <h2>3. Qué información compartimos y con quién</h2>
        <p>
          El negocio del que comprás recibe los datos necesarios para preparar y entregar tu
          pedido (nombre y teléfono del destinatario, dirección, dedicatoria). MIMO no vende tus
          datos a terceros ni los comparte con fines publicitarios.
        </p>
        <p>
          Las listas de regalos y las cabudas son públicas para quien tenga el link, a
          propósito — es parte de cómo funcionan. En una lista de regalos, cualquiera con el
          link ve si un producto ya fue reservado, pero no quién lo reservó (eso solo lo ve el
          dueño de la lista). En una cabuda, cualquiera con el link ve el nombre y el monto de
          cada persona que aportó — como en cualquier colecta o &quot;vaquita&quot;. Si preferís
          mantener alguna de estas en privado, no compartas su link.
        </p>
        <p>
          Las fotos que subís (perfil, banner o productos como dueño de negocio, o las que
          agregás a una reseña) son públicas dentro del Sitio una vez publicadas — no subas
          imágenes que no tengas derecho a usar.
        </p>

        <h2>4. Pagos y proveedores externos</h2>
        <ul>
          <li>
            <strong>PayPal:</strong> si pagás con PayPal, el pago lo procesa PayPal
            directamente — le compartimos el monto a cobrar, pero MIMO no ve ni guarda tu número
            de tarjeta ni tus credenciales de PayPal.
          </li>
          <li>
            <strong>Sentry:</strong> si algo falla en el Sitio, le mandamos información técnica
            del error (qué pasó y en qué página, nunca tu contraseña ni datos de pago) para poder
            solucionarlo rápido.
          </li>
          <li>
            <strong>Anthropic (Claude):</strong> funciones como &quot;Ayúdame a elegir&quot; y el
            asistente de dedicatorias le mandan a este proveedor de IA el texto que escribís en
            ese momento (por ejemplo, &quot;cumpleaños de mi novia, presupuesto $30&quot;) para
            sugerirte productos u opciones de mensaje — no tu historial de pedidos ni otros datos
            de tu cuenta. Si no hay un proveedor de IA configurado, estas funciones igual
            funcionan con reglas internas en vez de IA.
          </li>
          <li>
            <strong>Anthropic (Claude) en el chat de soporte:</strong> el asistente del chat le
            manda a este proveedor lo que escribís en la conversación. Si le pedís el estado de
            un pedido tuyo, también le llega el estado de ese pedido (productos, estado y pago),
            pero nunca la dirección, el teléfono ni el correo del pedido. Sin proveedor de IA
            configurado, el chat responde con reglas internas.
          </li>
        </ul>
        <p>
          <strong>Chat de soporte.</strong> Guardamos las conversaciones del chat de ayuda. Si
          pedís hablar con una persona, el equipo de MIMO puede leer esa conversación para
          responderte. Si no tenés sesión iniciada, te pedimos tu nombre y correo solo en ese
          momento, para poder contestarte. Estas conversaciones se conservan con el mismo criterio
          que el resto de los datos de tu cuenta (sección 6).
        </p>
        <p>
          Cada uno de estos proveedores procesa los datos que le compartimos según su propia
          política de privacidad, ajena a MIMO.
        </p>

        <h2>5. Cookies y tecnologías similares</h2>
        <p>
          Usamos una sola cookie de sesión, necesaria para mantenerte conectado/a a tu cuenta
          entre una página y otra. No es una cookie de rastreo ni de publicidad, no la compartimos
          con terceros, y se borra cuando cerrás sesión o expira. No usamos cookies de análisis ni
          de marketing.
        </p>

        <h2>6. Conservación de datos</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si pedís eliminar tu cuenta,
          borramos los datos personales asociados salvo los que debamos conservar por obligación
          legal o para resolver disputas ya abiertas (por ejemplo, el historial de un pedido en
          proceso).
        </p>

        <h2>7. Documentos de identidad de los negocios (DUI)</h2>
        <p>
          Para aprobar un negocio, su titular o representante legal sube una foto de su DUI (frente
          y reverso) y una foto suya sosteniendo el DUI. <strong>{DOCUMENT_PURPOSE_STATEMENT}</strong>
        </p>
        <ul>
          <li>
            <strong>Aceptación:</strong> se pide de forma expresa al registrar el negocio (o, si el
            negocio ya existía o esta política cambia, antes de subir cualquier documento). Sin
            aceptarla no se puede subir ningún documento.
          </li>
          <li>
            <strong>Quién lo ve:</strong> únicamente el titular y los administradores de MIMO
            expresamente autorizados para verificar negocios. Un administrador común no tiene
            acceso. Cada vez que uno abre, rechaza o borra un documento queda registrado con su
            nombre y la fecha.
          </li>
          <li>
            <strong>Quién no lo ve:</strong> nunca se muestra públicamente en el Sitio, ni a los
            clientes, ni a otros negocios. No lo compartimos con terceros, salvo que una ley o
            una autoridad competente nos obligue a entregarlo.
          </li>
          <li>
            <strong>Para qué no se usa:</strong> no se usa para marketing, publicidad ni perfilado.
            Además de verificar la cuenta, solo lo usamos o conservamos cuando una ley, un
            requerimiento de autoridad, una auditoría o una disputa abierta lo requiera.
          </li>
          <li>
            <strong>Cómo se guarda:</strong> en forma privada, en la base de datos (nunca en una
            dirección pública), y solo se entrega a quien tiene sesión y permiso. Detalle técnico en{" "}
            <Link href="/seguridad" className="underline">
              Seguridad
            </Link>
            .
          </li>
        </ul>
        <p>
          <strong>Cuánto tiempo lo conservamos y cuándo se elimina:</strong>
        </p>
        <ul>
          <li>
            <strong>Negocio activo o suspendido:</strong> mientras esté en MIMO, para poder
            responder a reclamos o investigaciones.
          </li>
          <li>
            <strong>Solicitud rechazada:</strong> lo eliminamos {DOCUMENT_RETENTION_REJECTED_DAYS}{" "}
            días después del rechazo.
          </li>
          <li>
            <strong>Negocio dado de baja:</strong> lo eliminamos {DOCUMENT_RETENTION_CLOSED_DAYS} días
            después de la baja (tiempo para resolver reclamos o disputas que estén abiertos).
          </li>
          <li>
            <strong>Cuando lo pidas:</strong> podés pedir que lo eliminemos en cualquier momento
            escribiéndonos desde Ayuda. Lo hacemos, salvo que una ley nos obligue a conservarlo o
            haya un reclamo, una disputa o una investigación por fraude abierta.
          </li>
          <li>
            <strong>Copias de seguridad:</strong> las copias de respaldo de la base de datos pueden
            conservar el archivo unos días más, hasta que se renueven.
          </li>
        </ul>

        <h2>8. Derechos del usuario</h2>
        <p>
          Desde &quot;Mi perfil&quot; podés actualizar tus datos de contacto y contraseña en cualquier
          momento. Para pedir acceso, corrección o eliminación de tu cuenta o de datos
          específicos, escribinos desde la sección de Ayuda.
        </p>

        <h2>9. Privacidad de menores</h2>
        <p>
          MIMO no está dirigido a menores de 18 años y no recolectamos intencionalmente datos de
          menores. Si sos madre, padre o tutor/a y creés que un menor a tu cargo nos dio datos
          personales, escribinos para eliminarlos.
        </p>

        <h2>10. Cambios a esta política</h2>
        <p>
          Si hacemos cambios importantes a esta política, lo vamos a anunciar en el Sitio con
          anticipación razonable.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Para preguntas sobre esta política, o para pedir acceso, corrección o eliminación de
          tus datos, escribinos desde la sección de Ayuda del Sitio o a{" "}
          <a href="mailto:soporte@mimo.sv" className="underline">
            soporte@mimo.sv
          </a>
          .
        </p>
      </div>
    </div>
  );
}
