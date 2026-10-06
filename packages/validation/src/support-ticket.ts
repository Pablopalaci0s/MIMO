import { z } from "zod";

export const SUPPORT_TICKET_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_BUSINESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export const SUPPORT_TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const SUPPORT_TICKET_VIEWS = [
  "nuevos",
  "mios",
  "sin_asignar",
  "en_atencion",
  "esperando_cliente",
  "esperando_negocio",
  "escalados",
  "resueltos",
  "cerrados",
  "todos",
] as const;

export const supportTicketStatusSchema = z.enum(SUPPORT_TICKET_STATUSES);
export const supportTicketPrioritySchema = z.enum(SUPPORT_TICKET_PRIORITIES);

/** "2026-10-05" → solo fechas sin hora, validadas. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Fecha inválida");

/** Filtros de la bandeja. Todo opcional; el servidor ignora lo que el rol no puede ver. */
export const supportTicketListQuerySchema = z.object({
  view: z.enum(SUPPORT_TICKET_VIEWS).default("todos"),
  status: supportTicketStatusSchema.optional(),
  priority: supportTicketPrioritySchema.optional(),
  /** slug de la categoría */
  category: z.string().trim().max(60).optional(),
  /** id de un agente, "none" (sin asignar) o "me" */
  agent: z.union([z.string().uuid(), z.literal("none"), z.literal("me")]).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  /** búsqueda libre: nombre/correo del cliente, asunto */
  q: z.string().trim().max(100).optional(),
  /** número de pedido (o parte) */
  order: z.string().trim().max(40).optional(),
  /** nombre del negocio (o parte) */
  business: z.string().trim().max(80).optional(),
  /** "T-1042", "1042" o el id del ticket */
  ticket: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type SupportTicketListQuery = z.infer<typeof supportTicketListQuerySchema>;

const reason = z.string().trim().min(5, "Contá brevemente por qué (mínimo 5 caracteres)").max(500, "Máximo 500 caracteres");

/**
 * Acciones sobre un ticket. Es una unión discriminada: cada acción trae
 * únicamente los campos que necesita. NUNCA se acepta del cliente el
 * customerId, el agente "que actúa" ni permisos — salen de la sesión.
 */
export const supportTicketActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("take") }),
  z.object({ action: z.literal("release") }),
  z.object({ action: z.literal("assign"), agentId: z.string().uuid("Agente inválido") }),
  z.object({
    action: z.literal("status"),
    // NEW no es un estado al que se pueda volver a mano.
    status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_BUSINESS", "RESOLVED", "CLOSED"]),
  }),
  z.object({ action: z.literal("priority"), priority: supportTicketPrioritySchema }),
  z.object({ action: z.literal("category"), categoryId: z.string().uuid("Categoría inválida") }),
  z.object({
    action: z.literal("link_order"),
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^MIMO-\d{8}-[A-Z0-9]{5}$/, "El número de pedido tiene el formato MIMO-AAAAMMDD-XXXXX"),
  }),
  z.object({ action: z.literal("unlink_order") }),
  z.object({ action: z.literal("link_business"), businessId: z.string().uuid("Negocio inválido") }),
  z.object({ action: z.literal("unlink_business") }),
  z.object({ action: z.literal("escalate"), reason }),
]);
export type SupportTicketActionInput = z.infer<typeof supportTicketActionSchema>;

/** Respuesta al cliente (kind=reply) o nota interna (kind=note). */
export const supportTicketMessageSchema = z.object({
  kind: z.enum(["reply", "note"]),
  body: z.string().trim().min(1, "Escribí un mensaje").max(4000, "Máximo 4000 caracteres"),
  /** Solo para respuestas: dejar el ticket esperando al cliente después de enviar. */
  waitForCustomer: z.boolean().optional(),
});
export type SupportTicketMessageInput = z.infer<typeof supportTicketMessageSchema>;

export const supportTicketMessagesQuerySchema = z.object({
  /** createdAt (ISO) del mensaje más viejo ya cargado: se devuelven los anteriores. */
  before: z.string().datetime().optional(),
  /** createdAt (ISO) del último mensaje ya cargado: se devuelven solo los nuevos (polling). */
  after: z.string().datetime().optional(),
});

export const supportCategoryInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  description: z.string().trim().max(200).optional().nullable(),
  defaultPriority: supportTicketPrioritySchema,
  isActive: z.boolean().default(true),
  position: z.coerce.number().int().min(0).max(999).default(0),
});
export const supportCategoryUpdateSchema = supportCategoryInputSchema.partial();

export const supportMacroInputSchema = z.object({
  title: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  body: z.string().trim().min(2, "Escribí el texto de la respuesta").max(2000),
  categoryId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});
export const supportMacroUpdateSchema = supportMacroInputSchema.partial();

export const supportMetricsQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value), "Elegí 7, 30 o 90 días").default(30),
});

/** Filtros de la pantalla de calificaciones (los vacíos del formulario cuentan como "sin filtro"). */
export const supportRatingsQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value), "Elegí 7, 30 o 90 días").default(30),
  agent: z.preprocess((value) => (value === "" ? undefined : value), z.string().uuid("Agente inválido").optional()),
  kind: z.preprocess((value) => (value === "" ? undefined : value), z.enum(["all", "good", "neutral", "bad"]).default("all")),
});
export type SupportRatingsQuery = z.infer<typeof supportRatingsQuerySchema>;

// ───────────────────── nombre de usuario del personal ─────────────────────

/** Nombres que nadie del personal puede elegir: se confundirían con la marca, el asistente o el sistema. */
export const RESERVED_SUPPORT_USERNAMES = [
  "mimo",
  "soporte",
  "support",
  "admin",
  "administrador",
  "equipo",
  "sistema",
  "system",
  "bot",
  "asistente",
  "ayuda",
  "help",
  "supervisor",
  "agente",
  "moderador",
];

/**
 * 3 a 24 caracteres: minúsculas, números, punto, guion y guion bajo; empieza y
 * termina con letra o número. Se guarda en minúsculas (así "Ana" y "ana" son el mismo).
 */
export const supportUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(24, "Máximo 24 caracteres")
  .regex(/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/, "Usá solo letras, números, punto, guion o guion bajo, sin espacios ni acentos")
  .refine((value) => !/[._-]{2,}/.test(value), "No uses dos signos seguidos")
  .refine((value) => !RESERVED_SUPPORT_USERNAMES.includes(value), "Ese nombre está reservado");

export const supportUsernameInputSchema = z.object({ username: supportUsernameSchema });
export type SupportUsernameInput = z.infer<typeof supportUsernameInputSchema>;

/** "Ana María Martínez" → "ana.martinez"; si no sirve, "nuevo.agente". Solo es una sugerencia: el agente decide. */
export function suggestSupportUsername(fullName: string | null | undefined): string {
  const words = (fullName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const candidate = words.length >= 2 ? `${words[0]}.${words.at(-1)}` : (words[0] ?? "");
  const parsed = supportUsernameSchema.safeParse(candidate.slice(0, 24));
  return parsed.success ? parsed.data : "nuevo.agente";
}
