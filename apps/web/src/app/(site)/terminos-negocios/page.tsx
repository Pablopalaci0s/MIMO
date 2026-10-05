import Link from "next/link";
import type { Metadata } from "next";
import {
  AGREEMENT_CHANGE_NOTICE_DAYS,
  BUSINESS_AGREEMENT_UPDATED,
  BUSINESS_AGREEMENT_VERSION,
  ORDER_CONFIRMATION_WINDOW_MINUTES,
} from "@/lib/legal/business-agreement";

export const metadata: Metadata = {
  title: "Acuerdo para negocios",
  description: "Condiciones que aceptan los negocios al venderse en MIMO: comisión, pagos, cancelaciones y responsabilidades.",
};

export default function TerminosNegociosPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Acuerdo MIMO ↔ negocio</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Versión {BUSINESS_AGREEMENT_VERSION} · Última actualización: {BUSINESS_AGREEMENT_UPDATED}
      </p>

      <div className="mt-8 flex flex-col gap-4 text-sm [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-neutral-900 [&>p]:leading-relaxed [&>p]:text-neutral-600 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:text-neutral-600">
        <p>
          Este acuerdo regula la relación entre MIMO (la &quot;Plataforma&quot;) y el negocio que se
          registra para vender en ella (el &quot;Negocio&quot;). Se acepta al enviar la solicitud de
          alta o, para negocios ya registrados, desde el aviso del panel de negocio. Se lee junto
          con los{" "}
          <Link href="/terminos" className="underline">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>{" "}
          del Sitio; si hay una contradicción sobre la relación con los negocios, manda este
          acuerdo.
        </p>

        <h2>1. Qué es MIMO y qué es el Negocio</h2>
        <p>
          MIMO es un intermediario: muestra el catálogo del Negocio, recibe el pedido, procesa el
          pago en línea cuando corresponde y se lo comunica al Negocio. El Negocio es un
          comerciante independiente: no hay relación laboral, de sociedad ni de representación
          entre ambos. El Negocio vende en nombre propio y es el vendedor frente al comprador.
        </p>

        <h2>2. Aprobación y documentación</h2>
        <p>
          Cada solicitud la revisa el equipo de MIMO antes de publicarse; MIMO puede aprobarla,
          rechazarla o pedir más información, sin obligación de justificar un rechazo. Después de
          registrarte, para que tu Negocio pueda ser aprobado, el titular o representante legal
          tiene que subir desde su panel (sección <strong>Verificación</strong>):
        </p>
        <ul>
          <li>El DUI, por el frente y por el reverso.</li>
          <li>Una foto del titular sosteniendo su DUI, con la cara y el documento visibles.</li>
        </ul>
        <p>Además puede subir, y MIMO puede pedirle si lo considera necesario:</p>
        <ul>
          <li>
            Si es persona jurídica, la documentación que acredite su existencia y quién la
            representa.
          </li>
          <li>NIT y, si el Negocio es contribuyente de IVA, su número de registro (NRC).</li>
          <li>
            Los permisos que exija la ley para su actividad (por ejemplo sanitarios o municipales
            si vende alimentos o productos regulados).
          </li>
          <li>Una cuenta de PayPal del Negocio, para recibir los pagos (sección 4).</li>
        </ul>
        <p>
          Estos documentos se usan únicamente para verificar la identidad del titular y la
          legitimidad del Negocio, se guardan de forma privada y solo los ve el titular y el equipo
          de MIMO que verifica negocios (cada vez que alguien del equipo abre uno queda
          registrado), según la{" "}
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>
          . El Negocio declara que toda la información y los documentos que entrega son verdaderos
          y que el DUI es del titular; se compromete a mantenerlos actualizados. Entregar
          información o documentos falsos es causa de suspensión inmediata.
        </p>

        <h2>3. Comisión de MIMO</h2>
        <p>
          MIMO cobra una comisión, que es un porcentaje del valor de cada pedido del Negocio. Ese
          valor incluye los productos y el costo de envío del propio Negocio, con la parte
          proporcional de cualquier cupón de MIMO ya descontada. La comisión estándar al momento de
          este acuerdo es del <strong>10%</strong>.
        </p>
        <ul>
          <li>
            El porcentaje vigente de tu Negocio figura en tu panel (sección Perfil). Puede ser menor
            que el estándar durante una prueba o promoción que MIMO ofrezca; al terminar la prueba
            se aplica la comisión que corresponda.
          </li>
          <li>
            El porcentaje que aplica a un pedido es el vigente cuando el cliente lo paga: un
            cambio posterior no modifica pedidos anteriores.
          </li>
          <li>
            MIMO puede cambiar la comisión avisando con al menos {AGREEMENT_CHANGE_NOTICE_DAYS} días
            de anticipación. El cambio solo rige para pedidos posteriores al aviso y, si no lo
            aceptás, podés terminar este acuerdo (sección 19) antes de que entre en vigor.
          </li>
          <li>
            Tu parte neta de un pedido pagado en línea es el valor del pedido menos la comisión.
            Mientras MIMO no te avise un cambio conforme a esta sección, el costo de procesamiento
            del pago en línea lo asume MIMO y no se descuenta de tu parte.
          </li>
        </ul>

        <h2>4. Cuándo y cómo recibís tu dinero</h2>
        <ul>
          <li>
            <strong>Pagos en línea (PayPal):</strong> el comprador paga el total a MIMO al hacer el
            pedido. Cuando <em>confirmás</em> tu parte del pedido, MIMO te envía tu parte neta
            automáticamente al correo de PayPal que cargaste en tu panel. Los tiempos de
            acreditación dependen de PayPal.
          </li>
          <li>
            Si no cargaste un correo de PayPal, o el envío falla, tu pedido igual se confirma pero
            el pago queda pendiente: el equipo de MIMO te contacta para resolverlo. Es tu
            responsabilidad mantener un correo de PayPal válido.
          </li>
          <li>
            <strong>Pago contra entrega en efectivo:</strong> cobrás el dinero directamente al
            cliente al entregar. La comisión de esos pedidos se liquida entre MIMO y el Negocio
            según el mecanismo que MIMO comunique con al menos {AGREEMENT_CHANGE_NOTICE_DAYS} días
            de anticipación; hasta entonces MIMO no te cobra comisión por pedidos en efectivo.
          </li>
          <li>
            MIMO puede retener temporalmente un pago cuando haya un reclamo abierto sobre ese
            pedido o una investigación por posible fraude (sección 15), por el tiempo necesario
            para resolverlo.
          </li>
        </ul>

        <h2>5. Si no confirmás un pedido</h2>
        <p>
          Tenés <strong>{ORDER_CONFIRMATION_WINDOW_MINUTES} minutos</strong> desde que se hace el
          pedido para confirmar tu parte. Si no la confirmás en ese plazo, en los pedidos pagados en
          línea tu parte se cancela automáticamente y se le reembolsa al comprador: no recibís pago
          por ella. Los pedidos en efectivo sin confirmar pueden ser cancelados por MIMO. No confirmar
          pedidos de forma reiterada afecta la experiencia de los compradores y puede llevar a la
          suspensión del Negocio.
        </p>

        <h2>6. Si cancelás un pedido</h2>
        <p>
          Podés cancelar tu parte de un pedido desde el panel hasta antes de que salga a entrega
          (estado &quot;En camino&quot;); después de eso, la cancelación solo la puede gestionar el
          equipo de MIMO. Si cancelás una parte ya pagada en línea, se le reembolsa al comprador y
          no recibís pago por ella. Cancelar es legítimo cuando hay una causa real (por ejemplo, un
          producto agotado); cancelar con frecuencia o sin causa puede llevar a la suspensión.
        </p>

        <h2>7. Productos</h2>
        <p>
          El Negocio es el único responsable de sus productos: que existan, que estén en buen
          estado y sean seguros, que coincidan con la descripción y las fotos publicadas, y que
          cumplan la normativa que les aplique. No se pueden publicar productos ilegales,
          falsificados, robados ni que la ley o las políticas de MIMO prohíban. MIMO no fabrica ni
          almacena productos ni revisa cada publicación antes de que salga, y puede ocultar o
          eliminar las que incumplan.
        </p>

        <h2>8. Precios</h2>
        <p>
          El Negocio fija sus precios y el costo de envío por zona, en dólares estadounidenses
          (USD), y es responsable de que sean correctos. El precio publicado es el que paga el
          comprador y debe incluir los impuestos que correspondan (sección 17). Si un precio se
          publicó con un error evidente, MIMO puede ocultar el producto y, si ya hay pedidos, el
          Negocio debe avisarle al comprador y resolverlo con él antes de confirmar o cancelar.
          Los cupones de MIMO se reparten proporcionalmente entre los negocios del carrito: la parte
          de descuento que corresponde a tu Negocio se descuenta del valor de su pedido.
        </p>

        <h2>9. Inventario y disponibilidad</h2>
        <p>
          Es tu responsabilidad mantener tu catálogo, tus horarios y tus zonas de entrega al día:
          pausá o despublicá los productos que no tengas. Si un producto ya pedido se agotó, tenés
          que cancelar ese pedido de inmediato (sección 6), no sustituirlo por otro sin el acuerdo
          del comprador.
        </p>

        <h2>10. Tiempos de preparación</h2>
        <p>
          El tiempo de preparación que cargás en tu panel es una promesa al comprador. Configurá
          tiempos realistas y respetá las fechas y horarios de entrega elegidos en el pedido,
          especialmente en fechas de alta demanda.
        </p>

        <h2>11. Entrega</h2>
        <p>
          MIMO no tiene repartidores propios: el Negocio prepara y entrega (o gestiona la entrega
          de) cada pedido bajo su responsabilidad, en la dirección, fecha y horario indicados, y
          responde por el producto hasta que llegue a manos del destinatario (incluyendo daños,
          pérdida o demora en el transporte, aunque use un servicio de terceros). Actualizá el
          estado del pedido en el panel a medida que avanza. Si el pedido es un{" "}
          <strong>regalo sorpresa</strong>, no reveles quién lo envió al destinatario.
        </p>

        <h2>12. Devoluciones y reembolsos</h2>
        <ul>
          <li>
            El comprador puede reportar un problema (no llegó, llegó dañado o distinto a lo
            publicado). MIMO revisa el reporte y puede pedirte tu versión y evidencia, que tenés que
            entregar con rapidez.
          </li>
          <li>
            Los productos perecederos o personalizados no se devuelven por simple arrepentimiento,
            pero sí corresponde reembolso cuando el problema es atribuible al Negocio.
          </li>
          <li>
            Cuando MIMO determine que el reembolso corresponde al Negocio, MIMO puede reembolsar al
            comprador y descontar ese monto de pagos pendientes del Negocio o pedirle que lo
            reintegre. En pedidos en efectivo, el Negocio hace el reembolso directamente.
          </li>
          <li>
            Si MIMO reembolsa a un comprador por un motivo que no es responsabilidad del Negocio,
            no se le descuenta nada.
          </li>
        </ul>

        <h2>13. Reseñas</h2>
        <p>
          Las reseñas pertenecen a los compradores: el Negocio no puede editarlas, borrarlas,
          comprarlas, ofrecer beneficios a cambio de reseñas positivas ni escribir reseñas sobre su
          propio Negocio o sobre competidores. Puede reportar una reseña que considere falsa o
          abusiva, y MIMO decide si la oculta o la mantiene.
        </p>

        <h2>14. Fotografías, contenido y marca</h2>
        <ul>
          <li>
            El Negocio declara tener los derechos sobre las fotos, textos, logos y demás contenido
            que sube, y responde si infringe derechos de terceros.
          </li>
          <li>
            Le da a MIMO una licencia gratuita, no exclusiva y revocable para mostrar ese contenido y
            el nombre y logo del Negocio en el Sitio, la app y las comunicaciones y redes de MIMO
            para promocionar el Negocio y la Plataforma, mientras el Negocio esté publicado. Si se da
            de baja, MIMO lo retira del Sitio, salvo lo que ya esté impreso o publicado en
            comunicaciones pasadas, que no está obligado a eliminar.
          </li>
          <li>
            <strong>Uso de la marca MIMO:</strong> el Negocio puede decir que vende en MIMO y usar
            el logo con los materiales que MIMO le entregue, sin modificarlo ni sugerir que MIMO
            respalda o es dueño del Negocio. MIMO puede pedir que se deje de usar.
          </li>
        </ul>

        <h2>15. Fraude y prácticas prohibidas</h2>
        <p>Están prohibidos, entre otros, y pueden llevar a la suspensión inmediata y a retener pagos:</p>
        <ul>
          <li>Crear pedidos o reseñas falsos, o comprarse a sí mismo para inflar ventas o puntuación.</li>
          <li>
            Llevarse al cliente fuera de MIMO para evitar la comisión de un pedido que se originó en
            la Plataforma.
          </li>
          <li>Cobrar de más, cobrar fuera de la Plataforma un pedido ya pagado en ella o manipular precios.</li>
          <li>Usar los datos de los compradores para fines que no sean cumplir el pedido (sección 18).</li>
          <li>Dar información falsa en el alta o en un reclamo.</li>
        </ul>

        <h2>16. Suspensión</h2>
        <p>
          MIMO puede suspender o dar de baja un Negocio, de inmediato, si incumple este acuerdo, por
          fraude, por reportes graves o reiterados, por no confirmar o cancelar pedidos de forma
          reiterada, por información falsa, o si lo exige la ley o una autoridad. Mientras está
          suspendido el Negocio deja de aparecer en el catálogo, no recibe pedidos nuevos y debe
          cumplir o cancelar con reembolso los pedidos que ya tenía aceptados. MIMO te avisará a
          través de tu panel; podés pedir la revisión de la decisión escribiendo a soporte.
        </p>

        <h2>17. Impuestos y facturación</h2>
        <p>
          El Negocio es el único responsable de sus obligaciones tributarias (renta, IVA,
          contribuciones municipales y las que correspondan), de incluir los impuestos en sus precios
          y de entregar al comprador los documentos fiscales que la ley exija por sus ventas. MIMO es
          responsable de sus propios impuestos y emitirá el documento fiscal que corresponda por la
          comisión que cobre.
        </p>

        <h2>18. Tratamiento de datos de los compradores</h2>
        <p>
          Para cumplir un pedido, MIMO le entrega al Negocio los datos necesarios (nombre y teléfono
          del destinatario, dirección, dedicatoria). El Negocio los puede usar únicamente para
          preparar y entregar ese pedido y atender reclamos sobre él: no puede usarlos para
          publicidad, venderlos, cederlos ni conservarlos más tiempo del necesario. Debe protegerlos
          con medidas razonables, no compartir su contraseña del panel y avisarle a MIMO sin demora si
          sospecha un acceso indebido a esos datos. Los datos del propio Negocio y de su titular los
          trata MIMO según la{" "}
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>
          .
        </p>

        <h2>19. Terminación</h2>
        <ul>
          <li>
            El Negocio puede terminar este acuerdo cuando quiera avisando a soporte con al menos 7
            días de anticipación y cumpliendo o cancelando con reembolso los pedidos en curso.
          </li>
          <li>
            MIMO puede terminarlo con {AGREEMENT_CHANGE_NOTICE_DAYS} días de aviso, o de inmediato en
            los casos de la sección 16.
          </li>
          <li>
            Al terminar, el Negocio deja de aparecer en el Sitio. Quedan vigentes los pagos y
            reembolsos pendientes, las obligaciones de impuestos y de protección de datos, las
            reseñas ya publicadas por compradores y las cláusulas que por su naturaleza deban
            sobrevivir.
          </li>
        </ul>

        <h2>20. Responsabilidad</h2>
        <p>
          En la medida que la ley lo permita, MIMO no responde por los productos, las entregas ni los
          actos del Negocio, y su responsabilidad frente al Negocio se limita al valor de la
          comisión que cobró por el pedido que originó el reclamo. El Negocio mantiene indemne a MIMO
          por reclamos de compradores o terceros que deriven de sus productos, contenidos,
          incumplimientos o infracciones de la ley.
        </p>

        <h2>21. Cambios a este acuerdo</h2>
        <p>
          MIMO puede actualizar este acuerdo; los cambios sustanciales se avisan con al menos{" "}
          {AGREEMENT_CHANGE_NOTICE_DAYS} días de anticipación en el panel del Negocio, y se pedirá
          aceptar la nueva versión. Si no la aceptás, MIMO puede dar por terminado este acuerdo una vez
          vencido el plazo de aviso. Cada aceptación queda registrada con su versión y fecha.
        </p>

        <h2>22. Ley aplicable</h2>
        <p>
          Este acuerdo se rige por las leyes de la República de El Salvador. Las diferencias que no
          se puedan resolver de buena fe entre las partes se someten a los tribunales competentes
          de San Salvador.
        </p>

        <h2>23. Contacto</h2>
        <p>
          Para dudas sobre este acuerdo, escribinos desde la sección de{" "}
          <Link href="/ayuda" className="underline">
            Ayuda
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
