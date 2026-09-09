import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  emoji,
  title,
  description,
  phase,
}: {
  emoji: string;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="text-4xl">{emoji}</span>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <p className="text-neutral-500">{description}</p>
      <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{phase}</p>
      <Button variant="outline" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
