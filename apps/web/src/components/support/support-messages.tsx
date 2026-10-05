"use client";

import { LifeBuoy, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "cn";
import type { SupportMessageDTO, SupportOrderCardDTO, SupportProductCardDTO } from "@mimo/types";
import { MimoMark } from "@/components/brand/mimo-mark";
import { ORDER_STATUS_LABEL, PAYMENT_PROVIDER_LABEL } from "@/lib/support/labels";

/**
 * Solo estas rutas internas se convierten en link — una lista cerrada a
 * propósito: el texto lo escribe una IA (y antes, una persona), así que
 * nunca se arma un <a> a partir de una URL arbitraria. Un grupo de captura
 * (el externo) para que `split` devuelva los links en las posiciones impares.
 */
const INTERNAL_LINK_PATTERN =
  /(\/(?:mis-pedidos|pedidos\/MIMO-\d{8}-[A-Z0-9]{5}|regalos|ayuda|ayudame-a-elegir|perfil(?:\/[a-z-]+)?|registro-negocio|iniciar-sesion|olvide-mi-contrasena|checkout|favoritos|notificaciones|soporte|seguridad|privacidad|terminos|productos\/[a-z0-9-]+|negocios\/[a-z0-9-]+))(?![\w/-])/g;

function linkify(text: string, onNavigate?: () => void): ReactNode[] {
  return text.split(INTERNAL_LINK_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <Link key={index} href={part} onClick={onNavigate} className="font-medium underline underline-offset-2">
        {part}
      </Link>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-SV", { hour: "numeric", minute: "2-digit" });
}

function ProductCards({ products, onNavigate }: { products: SupportProductCardDTO[]; onNavigate?: () => void }) {
  return (
    <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/productos/${product.slug}`}
          onClick={onNavigate}
          className="w-36 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 dark:bg-neutral-50"
        >
          <div className="relative h-24 w-full bg-neutral-100">
            {product.imageUrl && (
              <Image src={product.imageUrl} alt="" fill sizes="144px" className="object-cover" />
            )}
          </div>
          <div className="p-2">
            <p className="line-clamp-2 text-xs font-medium text-neutral-900">{product.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-500">{product.businessName}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">${product.price.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OrderCard({ order, onNavigate }: { order: SupportOrderCardDTO; onNavigate?: () => void }) {
  return (
    <Link
      href={`/pedidos/${order.orderNumber}`}
      onClick={onNavigate}
      className="mt-2 block rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 dark:bg-neutral-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-900">
          <Package className="size-3.5 text-neutral-400" />
          {order.orderNumber}
        </span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {order.items.map((item, index) => (
          <li key={index} className="flex items-start justify-between gap-2 text-xs text-neutral-600">
            <span className="min-w-0">
              {item.quantity} × {item.productName}
            </span>
            <span className="shrink-0 text-neutral-500">{ORDER_STATUS_LABEL[item.status]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-neutral-500">
        ${order.total.toFixed(2)} · {PAYMENT_PROVIDER_LABEL[order.paymentProvider]}
      </p>
    </Link>
  );
}

export function SupportMessageBubble({
  message,
  showSuggestions,
  onSuggestion,
  onNavigate,
}: {
  message: SupportMessageDTO;
  /** Solo el último mensaje del bot muestra sus respuestas rápidas. */
  showSuggestions: boolean;
  onSuggestion: (text: string) => void;
  onNavigate?: () => void;
}) {
  const isMine = message.role === "USER";
  const metadata = message.metadata;

  return (
    <div className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
      {!isMine && (
        <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-neutral-500">
          {message.role === "AGENT" ? (
            <>
              <LifeBuoy className="size-3" />
              {message.authorName ?? "Equipo"} · Soporte MIMO
            </>
          ) : (
            <>
              <MimoMark className="size-3 text-[#f98079]" />
              Asistente virtual
            </>
          )}
        </span>
      )}

      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isMine && "rounded-br-md bg-neutral-900 text-neutral-50",
          message.role === "BOT" && "rounded-bl-md bg-neutral-100 text-neutral-800",
          message.role === "AGENT" &&
            "rounded-bl-md border border-neutral-200 bg-white text-neutral-900 dark:bg-neutral-50",
        )}
      >
        {isMine ? message.body : linkify(message.body, onNavigate)}
      </div>

      {metadata?.order && (
        <div className="w-full max-w-[88%]">
          <OrderCard order={metadata.order} onNavigate={onNavigate} />
        </div>
      )}
      {metadata?.products && metadata.products.length > 0 && (
        <div className="w-full max-w-full">
          <ProductCards products={metadata.products} onNavigate={onNavigate} />
        </div>
      )}

      {showSuggestions && metadata?.suggestions && metadata.suggestions.length > 0 && (
        <div className="mt-1 flex max-w-full flex-wrap gap-1.5">
          {metadata.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <span className="px-1 text-[11px] text-neutral-400">{formatTime(message.createdAt)}</span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-1" aria-label="El asistente está escribiendo">
      <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-neutral-500">
        <MimoMark className="size-3 text-[#f98079]" />
        Asistente virtual
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 animate-bounce rounded-full bg-neutral-400"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
