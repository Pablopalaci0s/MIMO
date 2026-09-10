import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones — MIMO",
  description: "Términos y condiciones de uso de MIMO.",
};

const LAST_UPDATED = "10 de septiembre de 2026";

export default function TerminosPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Términos y condiciones</h1>
      <p className="mt-1 text-sm text-neutral-500">Última actualización: {LAST_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-4 text-sm [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-neutral-900 [&>p]:leading-relaxed [&>p]:text-neutral-600">
        <p>
          Estos términos regulan el uso de MIMO (el &quot;Sitio&quot;), un marketplace que conecta a
          personas que quieren comprar flores, regalos y detalles con negocios salvadoreños que
          los venden y entregan. Al crear una cuenta o hacer un pedido, aceptás estos términos.
        </p>

        <h2>1. Qué es MIMO y qué no es</h2>
        <p>
          MIMO es un intermediario: muestra el catálogo de negocios independientes, procesa el
          pedido y se lo comunica al negocio correspondiente. <strong>MIMO no fabrica, no
          almacena inventario y no entrega los productos</strong> — cada negocio prepara y
          entrega (o gestiona la entrega de) sus propios productos, bajo su propia
          responsabilidad de calidad, tiempos y cumplimiento.
        </p>

        <h2>2. Cuentas</h2>
        <p>
          Sos responsable de la confidencialidad de tu contraseña y de la actividad que ocurra en
          tu cuenta. Si sospechás un uso no autorizado, cambiá tu contraseña y escribinos.
          Podemos suspender cuentas que violen estos términos, incluyendo el registro de negocios
          con información falsa.
        </p>

        <h2>3. Pedidos y pago</h2>
        <p>
          Los precios se muestran en dólares estadounidenses (USD) e incluyen el detalle
          elegido; el costo de envío depende de la zona de entrega configurada por cada negocio y
          se muestra antes de confirmar el pedido. Por ahora MIMO solo procesa{" "}
          <strong>pago contra entrega en efectivo</strong> — no se captura ningún cobro al hacer
          el pedido. Si en el futuro se habilita pago con tarjeta u otro medio, este apartado se
          actualizará antes de activarlo.
        </p>
        <p>
          Un negocio puede no tener cobertura de entrega para tu zona; en ese caso el pedido no
          se puede completar con ese negocio y el Sitio lo indica antes de que confirmes.
        </p>

        <h2>4. Cancelaciones y reclamos</h2>
        <p>
          Si necesitás cancelar o modificar un pedido, contactá directamente al negocio lo antes
          posible — mientras más temprano en el proceso, más fácil de resolver. Para reclamos
          sobre la calidad o el estado de lo recibido, usá el botón de reporte disponible en el
          producto, el negocio o el pedido; el equipo de MIMO revisa cada reporte.
        </p>

        <h2>5. Reseñas y contenido de usuarios</h2>
        <p>
          Las reseñas deben corresponder a una compra real y no pueden contener contenido
          difamatorio, falso o que viole derechos de terceros. MIMO puede moderar, ocultar o
          eliminar reseñas y reportes que incumplan esto.
        </p>

        <h2>6. Negocios en la plataforma</h2>
        <p>
          Los negocios son responsables de la exactitud de su catálogo, precios, disponibilidad,
          y de cumplir con la normativa salvadoreña aplicable a su actividad (permisos,
          facturación, etc.). MIMO puede suspender o rechazar negocios que no cumplan estos
          términos o que reciban reportes reiterados.
        </p>

        <h2>7. Límite de responsabilidad</h2>
        <p>
          MIMO facilita la conexión entre compradores y negocios pero no garantiza la calidad,
          legalidad ni idoneidad de los productos ofrecidos por terceros. En la medida permitida
          por la ley, MIMO no es responsable por daños derivados del incumplimiento de un negocio
          independiente.
        </p>

        <h2>8. Cambios a estos términos</h2>
        <p>
          Podemos actualizar estos términos; los cambios importantes se van a anunciar en el
          Sitio con anticipación razonable. El uso continuado después de un cambio implica
          aceptación de los nuevos términos.
        </p>

        <h2>9. Contacto</h2>
        <p>Para preguntas sobre estos términos, escribinos desde la sección de Ayuda del Sitio.</p>
      </div>
    </div>
  );
}
