"use client";

import { ArrowUpRight, CheckCircle2, Hand, Link2, Loader2, Lock, RotateCcw, Unlink, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-error-message";
import { TRANSITIONS } from "@/lib/support/ticket-rules";
import type {
  SupportCategoryDTO,
  SupportStaffMemberDTO,
  SupportTicketPermissionsDTO,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@mimo/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "./labels";

interface Props {
  ticketId: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  categoryId: string;
  assignedAgentId: string | null;
  orderNumber: string | null;
  hasBusiness: boolean;
  permissions: SupportTicketPermissionsDTO;
  categories: SupportCategoryDTO[];
}

/** Estados a los que se puede pasar con el selector; resolver, cerrar, escalar y reabrir tienen su propio botón. */
const SELECTABLE: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS"];

const selectClass =
  "h-8 w-full rounded-md border border-neutral-300 bg-white px-2 text-[13px] text-neutral-900 disabled:bg-neutral-50 disabled:opacity-60 dark:bg-neutral-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
      {label}
      {children}
    </label>
  );
}

export function TicketActions({ ticketId, status, priority, categoryId, assignedAgentId, orderNumber, hasBusiness, permissions, categories }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<SupportStaffMemberDTO[]>([]);
  const [escalating, setEscalating] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [orderInput, setOrderInput] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessResults, setBusinessResults] = useState<{ id: string; name: string; municipality: string | null }[]>([]);

  // Solo supervisión puede asignar: carga el equipo una vez.
  useEffect(() => {
    if (!permissions.canAssign) return;
    async function load() {
      const response = await fetch("/api/centro-soporte/agentes").catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (result?.success) setStaff(result.data);
    }
    void load();
  }, [permissions.canAssign]);

  async function run(label: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(label);
    setError(null);
    const response = await fetch(`/api/centro-soporte/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setBusy(null);
    // Si otra persona lo tomó o lo movió antes, igual se refresca para mostrar cómo quedó.
    router.refresh();
    if (!result?.success) {
      setError(apiErrorMessage(result, "No pudimos completar la acción."));
      return false;
    }
    return true;
  }

  async function searchBusinesses(value: string) {
    setBusinessQuery(value);
    if (value.trim().length < 2) {
      setBusinessResults([]);
      return;
    }
    const response = await fetch(`/api/centro-soporte/negocios?q=${encodeURIComponent(value.trim())}`).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    setBusinessResults(result?.success ? result.data : []);
  }

  const reopenTarget: SupportTicketStatus = assignedAgentId ? "IN_PROGRESS" : "OPEN";
  const statusOptions = SELECTABLE.filter((candidate) => TRANSITIONS[status].includes(candidate));
  const canResolve = permissions.canChangeStatus && TRANSITIONS[status].includes("RESOLVED");
  const canClose = permissions.canChangeStatus && TRANSITIONS[status].includes("CLOSED");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5 [&_button]:rounded-md">
        {permissions.canTake && (
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void run("take", { action: "take" })} className="rounded-md bg-sc-primary text-white hover:bg-sc-primary-hover">
            {busy === "take" ? <Loader2 className="size-3.5 animate-spin" /> : <Hand className="size-3.5" />} Tomar ticket
          </Button>
        )}
        {permissions.canRelease && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("release", { action: "release" })}>
            Liberar
          </Button>
        )}
        {canResolve && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("resolve", { action: "status", status: "RESOLVED" })}>
            {busy === "resolve" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Resolver
          </Button>
        )}
        {canClose && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("close", { action: "status", status: "CLOSED" })}>
            <XCircle className="size-3.5" /> Cerrar
          </Button>
        )}
        {permissions.canReopen && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("reopen", { action: "status", status: reopenTarget })}>
            {busy === "reopen" ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Reabrir
          </Button>
        )}
        {permissions.canEscalate && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => setEscalating((open) => !open)}>
            <ArrowUpRight className="size-3.5" /> Escalar
          </Button>
        )}
      </div>

      {escalating && (
        <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-sc-danger/10">
          <p className="text-xs text-neutral-500">El motivo queda como nota interna y le avisa a supervisión.</p>
          <textarea
            value={escalateReason}
            onChange={(event) => setEscalateReason(event.target.value)}
            rows={2}
            maxLength={500}
            aria-label="Motivo de la escalada"
            placeholder="Por qué necesita supervisión…"
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none dark:bg-neutral-100"
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy !== null || escalateReason.trim().length < 5}
            onClick={async () => {
              if (await run("escalate", { action: "escalate", reason: escalateReason })) {
                setEscalating(false);
                setEscalateReason("");
              }
            }}
          >
            {busy === "escalate" ? <Loader2 className="size-3.5 animate-spin" /> : "Escalar ticket"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        {permissions.canChangeStatus && statusOptions.length > 0 && (
          <Field label="Cambiar estado">
            <select
              value=""
              disabled={busy !== null}
              onChange={(event) => event.target.value && void run("status", { action: "status", status: event.target.value })}
              className={selectClass}
            >
              <option value="">{STATUS_LABEL[status]} (actual)</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Prioridad">
          <select
            value={priority}
            disabled={!permissions.canChangePriority || busy !== null}
            onChange={(event) => void run("priority", { action: "priority", priority: event.target.value })}
            className={selectClass}
          >
            {(Object.keys(PRIORITY_LABEL) as SupportTicketPriority[]).map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Categoría">
          <select
            value={categoryId}
            disabled={!permissions.canChangeCategory || busy !== null}
            onChange={(event) => void run("category", { action: "category", categoryId: event.target.value })}
            className={selectClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        {permissions.canAssign && (
          <Field label="Asignar a">
            <select
              value={assignedAgentId ?? ""}
              disabled={busy !== null}
              onChange={(event) => event.target.value && void run("assign", { action: "assign", agentId: event.target.value })}
              className={selectClass}
            >
              <option value="">{assignedAgentId ? "Reasignar a…" : "Sin asignar — elegí una persona"}</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.activeTickets} activos)
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {permissions.canLink && (
        <div className="grid gap-3 border-t border-neutral-200 pt-4">
          <Field label="Pedido relacionado">
            {orderNumber ? (
              <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-800">
                <span className="font-mono text-xs">{orderNumber}</span>
                <button type="button" onClick={() => void run("unlink-order", { action: "unlink_order" })} className="text-neutral-500 hover:text-neutral-900" aria-label="Desvincular pedido">
                  <Unlink className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Input value={orderInput} onChange={(event) => setOrderInput(event.target.value)} placeholder="MIMO-20260912-AB12C" className="h-9 font-mono text-xs" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || !orderInput.trim()}
                  onClick={async () => {
                    if (await run("link-order", { action: "link_order", orderNumber: orderInput })) setOrderInput("");
                  }}
                >
                  <Link2 className="size-3.5" />
                </Button>
              </div>
            )}
          </Field>

          <Field label="Negocio relacionado">
            {hasBusiness ? (
              <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("unlink-business", { action: "unlink_business" })}>
                <Unlink className="size-3.5" /> Desvincular negocio
              </Button>
            ) : (
              <div className="relative">
                <Input value={businessQuery} onChange={(event) => void searchBusinesses(event.target.value)} placeholder="Buscar negocio por nombre…" className="h-9 text-sm" />
                {businessResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-md dark:bg-neutral-100">
                    {businessResults.map((business) => (
                      <li key={business.id}>
                        <button
                          type="button"
                          onClick={async () => {
                            if (await run("link-business", { action: "link_business", businessId: business.id })) {
                              setBusinessQuery("");
                              setBusinessResults([]);
                            }
                          }}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                        >
                          {business.name}
                          {business.municipality && <span className="text-xs text-neutral-400"> · {business.municipality}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        </div>
      )}

      {!permissions.canChangeStatus && !permissions.canTake && !permissions.canReopen && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Lock className="size-3" /> No tenés acciones disponibles sobre este ticket.
        </p>
      )}
    </div>
  );
}
