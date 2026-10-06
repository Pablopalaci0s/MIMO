/**
 * Única fuente de las preguntas frecuentes: la página /ayuda las muestra y
 * el asistente virtual las usa como base de conocimiento (el prompt de la
 * IA y el motor de reglas de respaldo leen de acá). Que sea un solo archivo
 * es a propósito — si la página dijera una cosa y el bot otra, el bot
 * estaría mintiendo. Cada respuesta tiene que ser verdad hoy, no un plan.
 *
 * `keywords` solo los usa el motor de reglas (cuando no hay IA configurada);
 * son sinónimos/formas en que la gente escribe la pregunta, sin tildes.
 */
export interface HelpItem {
  question: string;
  answer: string;
  keywords: string[];
}

export interface HelpGroup {
  title: string;
  items: HelpItem[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    title: "Pedidos y entrega",
    items: [
      {
        question: "¿Cómo hago un pedido?",
        answer:
          "Elegí un producto, personalizalo si querés (mensaje, dedicatoria), agregalo al carrito y completá tus datos y los del destinatario en el checkout. Podés combinar productos de distintos negocios en un mismo pedido.",
        keywords: ["pedido", "pedir", "comprar", "compra", "como compro", "hacer un pedido", "checkout"],
      },
      {
        question: "¿Me ayudan a elegir un regalo?",
        answer:
          "Sí. En \"Ayúdame a elegir\" (/ayudame-a-elegir) me contás para quién es, la ocasión y tu presupuesto, y te muestro opciones reales del catálogo. También podés decirme acá qué buscás (por ejemplo \"rosas\" o \"chocolates\") y te muestro lo que hay.",
        keywords: ["elegir un regalo", "ayudame a elegir", "que regalo", "recomendar un regalo", "idea de regalo", "ideas de regalo", "recomendacion"],
      },
      {
        question: "¿Cómo sé el estado de mi pedido?",
        answer:
          "En \"Mis pedidos\" vas a ver una línea de tiempo con el estado de cada producto: Pendiente, Confirmado, Preparando, En camino y Entregado. Como cada negocio prepara y entrega por su cuenta, si tu pedido tiene productos de más de un negocio, cada uno avanza de forma independiente.",
        keywords: ["estado", "seguimiento", "donde esta", "rastrear", "tracking", "llego", "cuando llega", "mis pedidos"],
      },
      {
        question: "¿Puedo hablar con el negocio sobre mi pedido?",
        answer:
          "Sí. En la página de tu pedido (Mis pedidos → abrí el pedido) hay una sección \"Mensajes\" para escribirle directo al negocio — por ejemplo para aclarar la dirección o un dato de la entrega. Te avisamos cuando te responda.",
        keywords: ["hablar con el negocio", "escribirle al negocio", "mensaje al negocio", "contactar negocio", "direccion", "aclarar"],
      },
      {
        question: "¿Entregan en mi zona?",
        answer:
          "Cada negocio define sus propias zonas de entrega. Cuando elegís el municipio del destinatario en el checkout, el Sitio te dice si ese negocio llega ahí antes de que confirmes — si no hay cobertura, el pedido no se puede completar con ese negocio.",
        keywords: ["zona", "cobertura", "entregan", "envio a", "llegan a", "municipio", "departamento", "domicilio"],
      },
      {
        question: "¿Puedo cancelar un pedido?",
        answer:
          "Todavía no hay cancelación automática desde la web. Escribile directamente al negocio (en la sección \"Mensajes\" de tu pedido, o por su WhatsApp) apenas puedas — mientras el pedido esté \"Pendiente\" o \"Confirmado\" es más fácil que se pueda resolver.",
        keywords: ["cancelar", "cancelacion", "anular", "ya no quiero", "me arrepenti"],
      },
      {
        question: "¿Qué es el modo sorpresa?",
        answer:
          "Al activarlo en el checkout, le pedís al negocio que no revele quién envía el regalo al momento de entregarlo, y podés dejar instrucciones especiales (ej. no llamar, entregar en recepción).",
        keywords: ["sorpresa", "anonimo", "no revelar", "regalo sorpresa", "modo sorpresa"],
      },
    ],
  },
  {
    title: "Pagos",
    items: [
      {
        question: "¿Qué métodos de pago aceptan?",
        answer:
          "Podés pagar contra entrega en efectivo, o con PayPal — el checkout de PayPal también acepta tarjeta sin necesidad de tener una cuenta. El pago con tarjeta directo dentro de MIMO todavía no está activo.",
        keywords: ["pago", "pagar", "metodo de pago", "tarjeta", "paypal", "efectivo", "contra entrega", "credito", "debito"],
      },
      {
        question: "¿Cómo uso un cupón de descuento?",
        answer:
          "Si tenés un código, ingresalo en el campo de cupón durante el checkout — el descuento se aplica al total antes de confirmar el pago.",
        keywords: ["cupon", "descuento", "codigo", "promo", "promocion", "oferta"],
      },
      {
        question: "¿El costo de envío es fijo?",
        answer:
          "No — cada negocio define su propio costo y zonas de entrega. Se calcula en el checkout según el municipio del destinatario.",
        keywords: ["envio", "costo de envio", "cuanto cuesta el envio", "flete", "delivery"],
      },
    ],
  },
  {
    title: "Regalos",
    items: [
      {
        question: "¿Qué es una lista de regalos?",
        answer:
          "Armá una lista de productos para una ocasión (cumpleaños, baby shower, etc.) y compartí el link — quien quiera puede marcar qué le gustaría regalarte para que nadie repita. Reservar un producto es un aviso entre las personas, no un pago ni un apartado: quien reserva igual tiene que comprarlo por su cuenta.",
        keywords: ["lista de regalos", "lista", "baby shower", "wishlist", "reservar regalo"],
      },
      {
        question: "¿Qué es una cabuda?",
        answer:
          "Es juntar plata entre varias personas para un regalo más grande. Armá una cabuda para un producto puntual, compartí el link, y cada quien aporta lo que quiera por PayPal. Cuando la cerrás, te mandamos todo lo recaudado para que hagas la compra vos.",
        keywords: ["cabuda", "vaquita", "colecta", "juntar plata", "aportar", "regalo grupal", "entre varios"],
      },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      {
        question: "Olvidé mi contraseña, ¿qué hago?",
        answer:
          "En la pantalla de iniciar sesión tocá \"¿Olvidaste tu contraseña?\" y poné tu correo. Te mandamos un link de un solo uso que vence en 1 hora para elegir una nueva.",
        keywords: ["contrasena", "olvide mi contrasena", "no puedo entrar", "restablecer", "recuperar cuenta", "clave", "password"],
      },
      {
        question: "¿Cómo cambio mi correo o mis datos?",
        answer:
          "Nombre, teléfono y contraseña los cambiás vos desde \"Mi perfil\". El correo, por ahora, no se puede cambiar desde ahí (afecta el inicio de sesión) — si lo necesitás, una persona del equipo de soporte lo hace por vos.",
        keywords: ["cambiar correo", "cambiar email", "cambiar mi correo", "actualizar datos", "mi perfil", "cambiar telefono", "eliminar cuenta", "borrar cuenta"],
      },
    ],
  },
  {
    title: "Reseñas y reportes",
    items: [
      {
        question: "¿Cómo dejo una reseña?",
        answer:
          "Una vez que un producto de tu pedido está marcado como \"Entregado\", vas a ver la opción de dejar reseña en la página de ese pedido. Podés agregar hasta 4 fotos. Las reseñas pasan por una revisión antes de publicarse.",
        keywords: ["resena", "calificar", "opinion", "valorar", "estrellas", "fotos de la resena"],
      },
      {
        question: "¿Cómo reporto un problema con un producto, negocio o reseña?",
        answer:
          "En la página del producto, del negocio, o al lado de cualquier reseña, vas a encontrar un botón \"Reportar\". Contanos el motivo y lo revisa nuestro equipo.",
        keywords: ["reportar", "reporte", "denunciar", "queja", "problema con", "fraude", "estafa"],
      },
    ],
  },
  {
    title: "Negocios",
    items: [
      {
        question: "Tengo un negocio de flores/regalos, ¿cómo lo sumo a MIMO?",
        answer:
          "Desde \"Sumá tu negocio\" (en el menú de tu cuenta, o en la ruta /registro-negocio) completás el formulario con los datos de tu negocio. Para enviar la solicitud tenés que aceptar el Acuerdo MIMO ↔ negocio (/terminos-negocios), que explica comisión, pagos, cancelaciones y responsabilidades. Después, desde tu panel (Verificación), subís tu DUI (frente y reverso) y una foto tuya con el DUI. Se utilizan para verificar la identidad y autenticidad de la cuenta del negocio y para cumplir las obligaciones legales aplicables: solo los ve personal autorizado de MIMO, nunca se muestran a clientes ni a otros negocios, y se borran a los 30 días si rechazamos la solicitud (o a los 90 si das de baja el negocio). Podés pedir que los borremos cuando quieras. Revisamos cada solicitud antes de publicarla — mientras tanto ya podés entrar a tu panel y ver que está pendiente de aprobación.",
        keywords: ["sumar mi negocio", "registrar negocio", "tengo un negocio", "vender en mimo", "alta de negocio", "negocio nuevo", "quiero vender", "acuerdo", "contrato negocio"],
      },
      {
        question: "¿Cuánto cobra MIMO por venta?",
        answer:
          "MIMO cobra una comisión sobre cada pedido (productos más envío del negocio): la estándar es 10% y puede haber períodos de prueba con menos. Tu porcentaje vigente lo ves en Perfil, dentro del panel de negocio. El detalle — cuándo recibís tu dinero, qué pasa si no confirmás o cancelás — está en el Acuerdo MIMO ↔ negocio (/terminos-negocios).",
        keywords: ["comision", "cuanto cobra", "tarifa", "planes", "precio para negocios", "cuanto cobran", "porcentaje", "cuando me pagan", "cuando cobro"],
      },
      {
        question: "¿Puedo exportar mis pedidos?",
        answer:
          "Sí — en el panel de negocio, dentro de \"Pedidos\", hay un botón para exportar a CSV. Te sirve para llevar tu contabilidad o pasarlo a otra herramienta.",
        keywords: ["exportar", "csv", "excel", "descargar pedidos", "contabilidad"],
      },
    ],
  },
  {
    title: "Soporte",
    items: [
      {
        question: "¿Cómo hablo con una persona del equipo de MIMO?",
        answer:
          "Desde el chat de ayuda (el botón de abajo a la derecha): contale tu consulta al asistente y, si no puede resolverla, tocá \"Hablar con una persona\" — o pedilo directamente. Una persona del equipo recibe tu conversación completa con un resumen para no hacerte repetir todo, y te responde en el mismo chat.",
        keywords: ["hablar con una persona", "soporte", "agente", "humano", "atencion al cliente", "contactar", "asesor", "operador", "ayuda humana"],
      },
    ],
  },
];

/** Texto plano de toda la base de conocimiento, para el prompt de la IA. */
export function helpContentAsPrompt(): string {
  return HELP_GROUPS.map(
    (group) =>
      `## ${group.title}\n` + group.items.map((item) => `P: ${item.question}\nR: ${item.answer}`).join("\n\n"),
  ).join("\n\n");
}
