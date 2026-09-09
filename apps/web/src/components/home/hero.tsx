import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          ¿Qué querés decirle?
        </h1>
        <p className="max-w-xl text-lg text-neutral-500">
          Encontrá el detalle perfecto para esa persona especial.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-12 rounded-full bg-brand px-7 text-base font-medium text-brand-foreground hover:bg-brand/90"
            asChild
          >
            <Link href="/ayudame-a-elegir">🎁 Ayúdame a elegir</Link>
          </Button>
          <Button variant="outline" className="h-12 rounded-full px-7 text-base font-medium" asChild>
            <Link href="/regalos">Explorar regalos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
