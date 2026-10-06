import type { SupportTicketStatus } from "@mimo/types";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATUSES,
  TRANSITIONS,
  canTransition,
  can,
  classifyCategory,
  botResolutionRate,
  buildDailySeries,
  percentChange,
  ratingDistribution,
  ratingRangeFor,
  satisfactionBreakdown,
  svDayKey,
  computeViewCounts,
  secondsToMinutes,
  conversationStatusFor,
  hasUnansweredCustomerMessage,
  statusAfterCustomerMessage,
  isManager,
  parseTicketNumber,
  permissionsFor,
  ticketCode,
  type StaffActor,
} from "./ticket-rules";

const agent: StaffActor = { id: "agent-1", role: "SUPPORT_AGENT" };
const otherAgent: StaffActor = { id: "agent-2", role: "SUPPORT_AGENT" };
const manager: StaffActor = { id: "mgr-1", role: "SUPPORT_MANAGER" };
const admin: StaffActor = { id: "admin-1", role: "ADMIN" };

const ALL: SupportTicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS", "ESCALATED", "RESOLVED", "CLOSED"];

describe("códigos de ticket", () => {
  it("formatea y parsea el número legible", () => {
    expect(ticketCode(1042)).toBe("T-1042");
    expect(parseTicketNumber("T-1042")).toBe(1042);
    expect(parseTicketNumber("t1042")).toBe(1042);
    expect(parseTicketNumber("1042")).toBe(1042);
    expect(parseTicketNumber("MIMO-20260912-AB12C")).toBeNull();
    expect(parseTicketNumber("")).toBeNull();
  });
});

describe("máquina de estados", () => {
  it("ningún estado transiciona a sí mismo y NINGUNO puede volver a NEW", () => {
    for (const status of ALL) {
      expect(canTransition(status, status)).toBe(false);
      expect(canTransition(status, "NEW")).toBe(false);
    }
  });

  it("flujo feliz: NEW → IN_PROGRESS → WAITING_CUSTOMER → IN_PROGRESS → RESOLVED → CLOSED", () => {
    const path: SupportTicketStatus[] = ["NEW", "IN_PROGRESS", "WAITING_CUSTOMER", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i]!, path[i + 1]!), `${path[i]}→${path[i + 1]}`).toBe(true);
  });

  it("un ticket NUEVO no se resuelve ni se pone a esperar sin que alguien lo atienda", () => {
    expect(canTransition("NEW", "RESOLVED")).toBe(false);
    expect(canTransition("NEW", "WAITING_CUSTOMER")).toBe(false);
    expect(canTransition("OPEN", "RESOLVED")).toBe(false);
  });

  it("RESOLVED y CLOSED se pueden reabrir; CLOSED solo vuelve a OPEN", () => {
    expect(canTransition("RESOLVED", "OPEN")).toBe(true);
    expect(canTransition("RESOLVED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("CLOSED", "OPEN")).toBe(true);
    expect(canTransition("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CLOSED", "RESOLVED")).toBe(false);
  });

  it("todo estado alcanzable tiene salida o es CLOSED (no hay callejones sin salida)", () => {
    for (const status of ALL) expect(TRANSITIONS[status].length).toBeGreaterThan(0);
  });

  it("los estados activos son exactamente los que no están cerrados ni resueltos", () => {
    expect([...ACTIVE_STATUSES].sort()).toEqual(ALL.filter((s) => s !== "RESOLVED" && s !== "CLOSED").sort());
  });
});

describe("permisos: ver (anti-IDOR)", () => {
  const free = { assignedAgentId: null, status: "NEW" as const };
  const mine = { assignedAgentId: agent.id, status: "IN_PROGRESS" as const };
  const theirs = { assignedAgentId: otherAgent.id, status: "IN_PROGRESS" as const };

  it("un agente ve la cola sin asignar y sus propios tickets", () => {
    expect(can(agent, "view", free)).toBe(true);
    expect(can(agent, "view", { assignedAgentId: null, status: "OPEN" })).toBe(true);
    expect(can(agent, "view", mine)).toBe(true);
  });

  it("un agente NO ve el ticket de otro agente aunque conozca el id", () => {
    expect(can(agent, "view", theirs)).toBe(false);
    expect(can(otherAgent, "view", mine)).toBe(false);
  });

  it("un agente no ve tickets sin asignar que ya están escalados o cerrados", () => {
    expect(can(agent, "view", { assignedAgentId: null, status: "ESCALATED" })).toBe(false);
    expect(can(agent, "view", { assignedAgentId: null, status: "CLOSED" })).toBe(false);
  });

  it("supervisor y administrador ven todo", () => {
    for (const actor of [manager, admin]) {
      expect(can(actor, "view", theirs)).toBe(true);
      expect(can(actor, "view", { assignedAgentId: null, status: "CLOSED" })).toBe(true);
    }
  });
});

describe("permisos: acciones", () => {
  const mine = { assignedAgentId: agent.id, status: "IN_PROGRESS" as const };
  const theirs = { assignedAgentId: otherAgent.id, status: "IN_PROGRESS" as const };
  const free = { assignedAgentId: null, status: "OPEN" as const };

  it("tomar: solo tickets sin dueño de la cola; nunca uno ya asignado", () => {
    expect(can(agent, "take", free)).toBe(true);
    expect(can(agent, "take", mine)).toBe(false);
    expect(can(agent, "take", theirs)).toBe(false);
    expect(can(agent, "take", { assignedAgentId: null, status: "ESCALATED" })).toBe(false);
    expect(can(manager, "take", { assignedAgentId: null, status: "ESCALATED" })).toBe(true);
    expect(can(agent, "take", { assignedAgentId: null, status: "RESOLVED" })).toBe(false);
  });

  it("un agente solo actúa sobre SUS tickets (responder, nota, estado, prioridad, categoría, vincular, escalar)", () => {
    for (const action of ["reply", "note", "status", "priority", "category", "link", "escalate"] as const) {
      expect(can(agent, action, mine), `${action} propio`).toBe(true);
      expect(can(agent, action, theirs), `${action} ajeno`).toBe(false);
      expect(can(agent, action, free), `${action} sin dueño`).toBe(false);
    }
  });

  it("asignar/reasignar es solo de supervisores y administradores", () => {
    expect(can(agent, "assign", mine)).toBe(false);
    expect(can(manager, "assign", theirs)).toBe(true);
    expect(can(admin, "assign", free)).toBe(true);
    expect(can(manager, "assign", { assignedAgentId: null, status: "CLOSED" })).toBe(false);
  });

  it("no se responde a un ticket resuelto o cerrado: primero hay que reabrirlo", () => {
    expect(can(agent, "reply", { assignedAgentId: agent.id, status: "RESOLVED" })).toBe(false);
    expect(can(manager, "reply", { assignedAgentId: agent.id, status: "CLOSED" })).toBe(false);
  });

  it("reabrir: un agente reabre su ticket RESOLVED, pero solo un supervisor reabre uno CLOSED", () => {
    expect(can(agent, "reopen", { assignedAgentId: agent.id, status: "RESOLVED" })).toBe(true);
    expect(can(otherAgent, "reopen", { assignedAgentId: agent.id, status: "RESOLVED" })).toBe(false);
    expect(can(agent, "reopen", { assignedAgentId: agent.id, status: "CLOSED" })).toBe(false);
    expect(can(manager, "reopen", { assignedAgentId: agent.id, status: "CLOSED" })).toBe(true);
    expect(can(manager, "reopen", mine)).toBe(false); // no está resuelto
  });

  it("nadie modifica un ticket CLOSED salvo reabrirlo (supervisor)", () => {
    const closed = { assignedAgentId: agent.id, status: "CLOSED" as const };
    for (const actor of [agent, manager, admin]) {
      for (const action of ["status", "priority", "category", "link", "note", "escalate", "assign"] as const) {
        expect(can(actor, action, closed), `${actor.role} ${action}`).toBe(false);
      }
    }
  });

  it("escalar no aplica a uno ya escalado o terminado", () => {
    expect(can(agent, "escalate", { assignedAgentId: agent.id, status: "ESCALATED" })).toBe(false);
    expect(can(agent, "escalate", { assignedAgentId: agent.id, status: "RESOLVED" })).toBe(false);
  });

  it("liberar: el dueño o un supervisor, nunca otro agente", () => {
    expect(can(agent, "release", mine)).toBe(true);
    expect(can(otherAgent, "release", mine)).toBe(false);
    expect(can(manager, "release", mine)).toBe(true);
    expect(can(agent, "release", free)).toBe(false);
  });

  it("permissionsFor refleja las mismas reglas para la interfaz", () => {
    expect(permissionsFor(agent, mine)).toMatchObject({ canReply: true, canAssign: false, isManager: false, canTake: false });
    expect(permissionsFor(manager, theirs)).toMatchObject({ canReply: true, canAssign: true, isManager: true });
    expect(permissionsFor(agent, free)).toMatchObject({ canTake: true, canReply: false });
  });

  it("administrador y supervisor cuentan como managers; el agente no", () => {
    expect(isManager(admin)).toBe(true);
    expect(isManager(manager)).toBe(true);
    expect(isManager(agent)).toBe(false);
  });
});

describe("clasificación de categoría", () => {
  it.each([
    ["Me cobraron doble el pedido", "pago"],
    ["Quiero un reembolso", "reembolso"],
    ["Mi pedido nunca llegó", "entrega"],
    ["El repartidor llegó tarde", "entrega"],
    ["Quiero cancelar mi pedido", "cancelacion"],
    ["Este cupón no me funciona", "cupon"],
    ["No puedo iniciar sesión", "cuenta"],
    ["Alguien hackeó mi cuenta", "seguridad"],
    ["Fue una estafa", "seguridad"],
    ["La página no carga", "problema_tecnico"],
    ["Tengo una queja de la tienda", "negocio"],
    ["Me llegó el pedido incompleto", "pedido"],
    ["hola buenas", "otro"],
  ])("«%s» → %s", (text, slug) => {
    expect(classifyCategory(text)).toBe(slug);
  });

  it("lo más delicado gana si hay varias coincidencias (fraude antes que pago)", () => {
    expect(classifyCategory("Es un fraude, me cobraron doble")).toBe("seguridad");
    expect(classifyCategory("Pido reembolso porque me cobraron doble")).toBe("reembolso");
  });
});

describe("sincronización con la conversación del cliente", () => {
  it.each([
    ["NEW", false, "WAITING_AGENT"],
    ["OPEN", false, "WAITING_AGENT"],
    ["IN_PROGRESS", true, "WITH_AGENT"],
    ["WAITING_CUSTOMER", true, "WITH_AGENT"],
    ["WAITING_BUSINESS", true, "WITH_AGENT"],
    ["ESCALATED", true, "WITH_AGENT"],
    ["ESCALATED", false, "WAITING_AGENT"],
    ["RESOLVED", true, "RESOLVED"],
    ["CLOSED", false, "RESOLVED"],
  ] as const)("%s (asignado=%s) → conversación %s", (status, assigned, expected) => {
    expect(conversationStatusFor(status, assigned)).toBe(expected);
  });
});

describe("mensajes del cliente sin responder", () => {
  const t = (ms: number | null) => (ms === null ? null : new Date(ms));
  it("detecta cuando el cliente escribió y el equipo no contestó", () => {
    expect(hasUnansweredCustomerMessage({ lastCustomerMessageAt: t(2000), lastAgentMessageAt: t(1000) })).toBe(true);
    expect(hasUnansweredCustomerMessage({ lastCustomerMessageAt: t(2000), lastAgentMessageAt: null })).toBe(true);
    expect(hasUnansweredCustomerMessage({ lastCustomerMessageAt: t(1000), lastAgentMessageAt: t(2000) })).toBe(false);
    expect(hasUnansweredCustomerMessage({ lastCustomerMessageAt: null, lastAgentMessageAt: t(2000) })).toBe(false);
  });
});

describe("el cliente escribe sobre un ticket existente", () => {
  it("esperando al cliente → vuelve a atención (o a la cola si nadie lo tiene)", () => {
    expect(statusAfterCustomerMessage("WAITING_CUSTOMER", true)).toEqual({ status: "IN_PROGRESS", reopened: false });
    expect(statusAfterCustomerMessage("WAITING_CUSTOMER", false)).toEqual({ status: "OPEN", reopened: false });
  });

  it("un ticket RESUELTO se reabre solo", () => {
    expect(statusAfterCustomerMessage("RESOLVED", true)).toEqual({ status: "IN_PROGRESS", reopened: true });
    expect(statusAfterCustomerMessage("RESOLVED", false)).toEqual({ status: "OPEN", reopened: true });
  });

  it("cualquier otro estado no cambia (NEW, IN_PROGRESS, ESCALATED, WAITING_BUSINESS, CLOSED)", () => {
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "ESCALATED", "WAITING_BUSINESS", "CLOSED"] as const) {
      expect(statusAfterCustomerMessage(status, true)).toEqual({ status, reopened: false });
    }
  });

  it("la reapertura automática es una transición válida de la máquina de estados", () => {
    const reopenedAssigned = statusAfterCustomerMessage("RESOLVED", true).status;
    const reopenedFree = statusAfterCustomerMessage("RESOLVED", false).status;
    expect(canTransition("RESOLVED", reopenedAssigned)).toBe(true);
    expect(canTransition("RESOLVED", reopenedFree)).toBe(true);
    expect(canTransition("WAITING_CUSTOMER", statusAfterCustomerMessage("WAITING_CUSTOMER", true).status)).toBe(true);
  });
});

describe("contadores por cola", () => {
  const rows = [
    { status: "NEW" as const, assignedAgentId: null, count: 3 },
    { status: "OPEN" as const, assignedAgentId: null, count: 2 },
    { status: "IN_PROGRESS" as const, assignedAgentId: "agent-1", count: 4 },
    { status: "IN_PROGRESS" as const, assignedAgentId: "agent-2", count: 1 },
    { status: "WAITING_CUSTOMER" as const, assignedAgentId: "agent-1", count: 2 },
    { status: "ESCALATED" as const, assignedAgentId: null, count: 1 },
    { status: "RESOLVED" as const, assignedAgentId: "agent-1", count: 5 },
    { status: "CLOSED" as const, assignedAgentId: "agent-2", count: 7 },
  ];

  it("cuenta cada cola desde una sola agrupación", () => {
    const counts = computeViewCounts(rows, "agent-1");
    expect(counts).toEqual({
      nuevos: 3,
      mios: 6, // IN_PROGRESS(4) + WAITING_CUSTOMER(2) de agent-1; los resueltos no cuentan como "míos"
      sin_asignar: 6, // NEW(3) + OPEN(2) + ESCALATED(1) sin dueño
      en_atencion: 5,
      esperando_cliente: 2,
      esperando_negocio: 0,
      escalados: 1,
      resueltos: 5,
      cerrados: 7,
      todos: 25,
    });
  });

  it("'mis tickets' depende de quién mira", () => {
    expect(computeViewCounts(rows, "agent-2").mios).toBe(1);
    expect(computeViewCounts(rows, "nadie").mios).toBe(0);
  });

  it("sin tickets, todo en cero", () => {
    expect(Object.values(computeViewCounts([], "agent-1")).every((n) => n === 0)).toBe(true);
  });
});

describe("métricas: cálculos", () => {
  it("convierte segundos a minutos con un decimal", () => {
    expect(secondsToMinutes(90)).toBe(1.5);
    expect(secondsToMinutes(3600)).toBe(60);
    expect(secondsToMinutes(125)).toBe(2.1);
    expect(secondsToMinutes(0)).toBe(0);
  });

  it("sin datos devuelve null (no 0): 'sin datos' no es lo mismo que 'cero minutos'", () => {
    expect(secondsToMinutes(null)).toBeNull();
    expect(secondsToMinutes(Number.NaN)).toBeNull();
  });

  it("% resueltos por el asistente vs. una persona", () => {
    expect(botResolutionRate(3, 1)).toBe(75);
    expect(botResolutionRate(1, 2)).toBe(33.3);
    expect(botResolutionRate(0, 5)).toBe(0);
    expect(botResolutionRate(4, 0)).toBe(100);
  });

  it("sin resoluciones no hay porcentaje", () => {
    expect(botResolutionRate(0, 0)).toBeNull();
  });
});

describe("serie diaria de métricas", () => {
  it("el día se cuenta en hora de El Salvador (UTC-6), no en UTC", () => {
    // 2026-10-06 03:30 UTC todavía es el 5 de octubre allá (21:30).
    expect(svDayKey(Date.UTC(2026, 9, 6, 3, 30))).toBe("2026-10-05");
    // 2026-10-06 06:00 UTC ya es 00:00 del 6.
    expect(svDayKey(Date.UTC(2026, 9, 6, 6, 0))).toBe("2026-10-06");
  });

  it("devuelve un punto por día, el último es hoy, y rellena con 0 los días sin tickets", () => {
    const now = Date.UTC(2026, 9, 6, 18, 0); // 6 de octubre, mediodía en El Salvador
    const series = buildDailySeries(
      4,
      now,
      [
        { day: "2026-10-03", n: 2 },
        { day: "2026-10-06", n: 5 },
      ],
      [{ day: "2026-10-05", n: 1 }],
    );
    expect(series).toEqual([
      { date: "2026-10-03", created: 2, resolved: 0 },
      { date: "2026-10-04", created: 0, resolved: 0 },
      { date: "2026-10-05", created: 0, resolved: 1 },
      { date: "2026-10-06", created: 5, resolved: 0 },
    ]);
  });

  it("ignora filas de días fuera del período y cruza bien el cambio de mes", () => {
    const now = Date.UTC(2026, 10, 2, 18, 0); // 2 de noviembre
    const series = buildDailySeries(3, now, [{ day: "2026-09-01", n: 99 }], []);
    expect(series.map((day) => day.date)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(series.every((day) => day.created === 0)).toBe(true);
  });
});

describe("comparación con el período anterior", () => {
  it("variación porcentual redondeada; sin base anterior no hay comparación", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
    expect(percentChange(10, 10)).toBe(0);
    expect(percentChange(7, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("distribución de calificaciones", () => {
  it("cuenta por estrella y descarta valores inválidos", () => {
    expect(
      ratingDistribution([
        { rating: 5, count: 3 },
        { rating: 1, count: 1 },
        { rating: 3, count: 2 },
        { rating: 0, count: 9 },
        { rating: 6, count: 9 },
        { rating: 2.5, count: 9 },
        { rating: null, count: 9 },
      ]),
    ).toEqual([1, 0, 2, 0, 3]);
    expect(ratingDistribution([])).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("CSAT y DSAT", () => {
  it("satisfechos = 4–5 ★, neutrales = 3 ★, insatisfechos = 1–2 ★; porcentajes sobre el total", () => {
    // 2×1★, 0×2★, 1×3★, 3×4★, 4×5★ = 10 calificaciones
    expect(satisfactionBreakdown([2, 0, 1, 3, 4])).toEqual({ count: 10, average: 3.7, satisfied: 7, neutral: 1, dissatisfied: 2, csatPercent: 70, dsatPercent: 20 });
  });

  it("sin calificaciones no hay porcentaje ni promedio (null, no 0 %)", () => {
    expect(satisfactionBreakdown([0, 0, 0, 0, 0])).toMatchObject({ count: 0, average: null, csatPercent: null, dsatPercent: null });
  });

  it("todas buenas = 100 % CSAT y 0 % DSAT; todas malas, al revés", () => {
    expect(satisfactionBreakdown([0, 0, 0, 0, 5])).toMatchObject({ csatPercent: 100, dsatPercent: 0, average: 5 });
    expect(satisfactionBreakdown([3, 2, 0, 0, 0])).toMatchObject({ csatPercent: 0, dsatPercent: 100, average: 1.4 });
  });

  it("redondea a un decimal", () => {
    // 1 de 3 satisfecho = 33,3 %
    expect(satisfactionBreakdown([0, 1, 1, 1, 0]).csatPercent).toBe(33.3);
  });

  it("el rango de estrellas de cada tipo", () => {
    expect(ratingRangeFor("good")).toEqual({ gte: 4, lte: 5 });
    expect(ratingRangeFor("neutral")).toEqual({ gte: 3, lte: 3 });
    expect(ratingRangeFor("bad")).toEqual({ gte: 1, lte: 2 });
    expect(ratingRangeFor("all")).toEqual({ gte: 1, lte: 5 });
  });
});
