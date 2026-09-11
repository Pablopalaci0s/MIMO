"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Para las tiras horizontales de categorías/emociones del home: en mobile
 * se navegan con swipe (nativo), pero en desktop con mouse no hay forma de
 * deslizarlas sin shift+scroll — de ahí las flechas que usan esto. Expone
 * si hay más contenido a cada lado para ocultar la flecha que no sirve
 * (ej. no mostrar "<" si ya estás al principio).
 */
export function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      setCanScrollLeft(el!.scrollLeft > 4);
      setCanScrollRight(el!.scrollLeft + el!.clientWidth < el!.scrollWidth - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function scrollByAmount(direction: "left" | "right") {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  }

  return { ref, canScrollLeft, canScrollRight, scrollByAmount };
}
