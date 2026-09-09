import Link from "next/link";
import type { OccasionDTO } from "@mimo/types";

export function EmotionGrid({ emotions }: { emotions: OccasionDTO[] }) {
  if (emotions.length === 0) return null;

  return (
    <section className="bg-brand-soft">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
          ¿Qué querés transmitir?
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Elegí el sentimiento y te mostramos los regalos ideales.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {emotions.map((emotion) => (
            <Link
              key={emotion.id}
              href={`/regalos?emocion=${emotion.slug}`}
              className="flex items-center gap-2 rounded-full border border-neutral-900/10 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-brand hover:text-brand"
            >
              <span>{emotion.emoji}</span>
              {emotion.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
