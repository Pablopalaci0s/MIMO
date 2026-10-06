import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguridad",
  description: "Las medidas técnicas que MIMO tiene implementadas hoy para proteger sus datos.",
};

const LAST_UPDATED = "6 de octubre de 2026";

export default function SeguridadPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Seguridad</h1>
      <p className="mt-1 text-sm text-neutral-500">Última actualización: {LAST_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-4 text-sm [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-neutral-600 [&>p]:leading-relaxed [&>p]:text-neutral-600">
        <p>
          Esta página explica, en términos concretos, las medidas de seguridad que tenemos{" "}
          <strong>implementadas actualmente</strong> para proteger sus datos — no es una lista de
          intenciones. Para saber qué datos recolectamos y cómo los usamos, ver la{" "}
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>
          .
        </p>

        <ul>
          <li>
            <strong>Contraseñas:</strong> se guardan siempre con hash (bcrypt) — no se almacenan
            en texto plano y no son accesibles como contraseñas originales ni siquiera por
            nuestro equipo.
          </li>
          <li>
            <strong>Recuperación de contraseña:</strong> el link que le mandamos usa un código
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
            <strong>Pagos:</strong> cuando paga con PayPal, el cobro se procesa siempre del lado
            de PayPal — su número de tarjeta nunca llega a los servidores de MIMO. El monto a
            cobrar siempre lo recalculamos nosotros en el servidor, nunca confiando en el monto
            que envía el navegador.
          </li>
          <li>
            <strong>Archivos:</strong> las imágenes que sube se validan por tipo y tamaño (máximo
            5MB, solo JPG/PNG/WEBP) antes de guardarse.
          </li>
          <li>
            <strong>Permisos:</strong> cada acción sobre sus pedidos, su negocio o su cuenta se
            verifica en el servidor contra quién es realmente — no alcanza con estar logueado
            para ver o modificar datos de otra cuenta o negocio.
          </li>
          <li>
            <strong>Encabezados de seguridad:</strong> el Sitio usa protecciones estándar del
            navegador (como CSP y HSTS) para reducir el riesgo de ataques comunes como
            clickjacking o inyección de scripts de terceros.
          </li>
          <li>
            <strong>Documentos de identidad:</strong> los documentos de verificación de los
            negocios (DUI y similares) se guardan en la base de datos, no en una carpeta pública,
            y solo se entregan al titular o a un administrador expresamente autorizado con sesión iniciada (ser administrador no alcanza); nunca se
            guardan en la caché del navegador. Revisamos que el archivo sea realmente una imagen
            o un PDF (no un archivo disfrazado) y cada vez que alguien del equipo abre uno queda
            registrado.
          </li>
          <li>
            <strong>Auditoría interna:</strong> las acciones sensibles que hace nuestro equipo
            desde el panel administrativo (suspender una cuenta, aprobar un negocio, moderar una
            reseña) quedan registradas — quién, qué y cuándo — para poder revisar el uso del
            panel.
          </li>
          <li>
            <strong>Chat de soporte:</strong> el asistente solo consulta pedidos de la cuenta con
            la que inició sesión (el servidor decide a quién pertenece cada consulta, no la IA),
            nunca le pasa a la IA su dirección, teléfono ni correo, y limita la cantidad de
            mensajes que se pueden mandar en un rato y por conversación para evitar abusos. Los visitantes sin cuenta
            solo pueden ver su propia conversación.
          </li>
          <li>
            <strong>Monitoreo:</strong> usamos Sentry para enterarnos rápido si algo falla en el
            Sitio.
          </li>
        </ul>

        <p>
          Ningún sistema es 100% infalible, así que le recomendamos usar una contraseña única
          para MIMO.
        </p>
      </div>
    </div>
  );
}
