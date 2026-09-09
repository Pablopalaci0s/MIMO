import { Check, X } from "lucide-react";
import type { OrderStatus } from "@mimo/types";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Pendiente" },
  { status: "CONFIRMED", label: "Confirmado" },
  { status: "PREPARING", label: "Preparando" },
  { status: "OUT_FOR_DELIVERY", label: "En camino" },
  { status: "DELIVERED", label: "Entregado" },
];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        <X className="size-4" />
        Este pedido fue cancelado.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <div className="flex items-start">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const isLast = index === STEPS.length - 1;
        return (
          <div key={step.status} className={`flex flex-1 flex-col items-center ${isLast ? "flex-none" : ""}`}>
            <div className="flex w-full items-center">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  done ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              {!isLast && (
                <span
                  className={`h-px flex-1 transition-colors ${index < currentIndex ? "bg-neutral-900" : "bg-neutral-200"}`}
                />
              )}
            </div>
            <span
              className={`mt-2 text-center text-xs font-medium ${done ? "text-neutral-900" : "text-neutral-400"}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
