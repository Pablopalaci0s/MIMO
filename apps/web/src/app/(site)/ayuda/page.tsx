import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Preguntas frecuentes sobre pedidos, entregas, pagos, regalos y negocios en MIMO.",
};

const FAQ_GROUPS: { title: string; items: { question: string; answer: string }[] }[] = [
  {
    title: "Pedidos y entrega",
    items: [
      {
        question: "¿Cómo hago un pedido?",
        answer:
          "Elegí un producto, personalizalo si querés (mensaje, dedicatoria), agregalo al carrito y completá tus datos y los del destinatario en el checkout. Podés combinar productos de distintos negocios en un mismo pedido.",
      },
      {
        question: "¿Cómo sé el estado de mi pedido?",
        answer:
          "En \"Mis pedidos\" vas a ver una línea de tiempo con el estado de cada producto: Pendiente, Confirmado, Preparando, En camino y Entregado. Como cada negocio prepara y entrega por su cuenta, si tu pedido tiene productos de más de un negocio, cada uno avanza de forma independiente.",
      },
      {
        question: "¿Puedo cancelar un pedido?",
        answer:
          "Todavía no hay cancelación automática desde la web. Escribile directamente al negocio (tenés su WhatsApp en la página del pedido) apenas puedas — mientras el pedido esté \"Pendiente\" o \"Confirmado\" es más fácil que se pueda resolver.",
      },
      {
        question: "¿Qué es el modo sorpresa?",
        answer:
          "Al activarlo en el checkout, le pedís al negocio que no revele quién envía el regalo al momento de entregarlo, y podés dejar instrucciones especiales (ej. no llamar, entregar en recepción).",
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
      },
      {
        question: "¿Cómo uso un cupón de descuento?",
        answer:
          "Si tenés un código, ingresalo en el campo de cupón durante el checkout — el descuento se aplica al total antes de confirmar el pago.",
      },
      {
        question: "¿El costo de envío es fijo?",
        answer:
          "No — cada negocio define su propio costo y zonas de entrega. Se calcula en el checkout según el municipio del destinatario.",
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
      },
      {
        question: "¿Qué es una cabuda?",
        answer:
          "Es juntar plata entre varias personas para un regalo más grande. Armá una cabuda para un producto puntual, compartí el link, y cada quien aporta lo que quiera por PayPal. Cuando la cerrás, te mandamos todo lo recaudado para que hagas la compra vos.",
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
      },
      {
        question: "¿Cómo reporto un problema con un producto, negocio o reseña?",
        answer:
          "En la página del producto, del negocio, o al lado de cualquier reseña, vas a encontrar un botón \"Reportar\". Contanos el motivo y lo revisa nuestro equipo.",
      },
    ],
  },
  {
    title: "Negocios",
    items: [
      {
        question: "Tengo un negocio de flores/regalos, ¿cómo lo sumo a MIMO?",
        answer:
          "Todavía no hay un formulario de alta automático — escribinos por WhatsApp y coordinamos el alta de tu negocio manualmente mientras terminamos ese flujo.",
      },
      {
        question: "¿Cuánto cobra MIMO por venta?",
        answer:
          "El modelo de comisiones y planes para negocios todavía está en definición — te lo contamos en detalle cuando coordinemos el alta.",
      },
      {
        question: "¿Puedo exportar mis pedidos?",
        answer:
          "Sí — en el panel de negocio, dentro de \"Pedidos\", hay un botón para exportar a CSV. Te sirve para llevar tu contabilidad o pasarlo a otra herramienta.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Centro de ayuda</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Las preguntas que más nos hacen. Si no encontrás lo que buscás, escribinos.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {FAQ_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              {group.title}
            </h2>
            <Accordion type="single" collapsible>
              {group.items.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-3 rounded-2xl border border-neutral-200 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
          <MessageCircle className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">¿Seguís con dudas?</p>
          <p className="text-sm text-neutral-500">Escribinos a cualquier negocio por WhatsApp desde su página.</p>
        </div>
      </div>
    </div>
  );
}
