const STEPS = [
  {
    emoji: "💬",
    title: "Contanos qué querés decir",
    description: "Ocasión, presupuesto y gustos. Nosotros interpretamos el resto.",
  },
  {
    emoji: "❤️",
    title: "Elegí entre opciones reales",
    description: "Productos disponibles de negocios salvadoreños, con precio y entrega claros.",
  },
  {
    emoji: "🚚",
    title: "Personalizá y enviá",
    description: "Agregá una dedicatoria, elegí fecha y horario, y listo.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="flex flex-col items-start gap-2">
            <span className="text-3xl">{step.emoji}</span>
            <h3 className="font-semibold text-neutral-900">{step.title}</h3>
            <p className="text-sm text-neutral-500">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
