/**
 * Base de datos FALSA en memoria para los tests del centro de soporte (no es
 * un test en sí: por eso no termina en `.test.ts`). Implementa el subconjunto
 * de Prisma que usan los servicios, con un evaluador real de `where`
 * (igualdad, null, in, not, gt/gte/lt/lte, contains, AND/OR), para probar
 * autorización, concurrencia y visibilidad de mensajes contra datos y no solo
 * contra "se llamó a tal función".
 *
 * Un filtro que el evaluador no entiende LANZA un error en vez de ignorarse:
 * así un test nunca pasa "por casualidad" porque un `where` se descartó.
 */

type Row = Record<string, unknown>;

export function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (key === "AND") return (Array.isArray(condition) ? condition : [condition]).every((part) => matches(row, part as Row));
    if (key === "OR") return (condition as Row[]).some((part) => matches(row, part));
    if (key === "NOT") return !matches(row, condition as Row);

    const value = row[key];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime();
    if (typeof condition !== "object") return value === condition;

    const c = condition as Row;
    if (!(key in row) && Object.keys(c).length > 0 && !("equals" in c)) {
      // Un filtro sobre una relación (ej. `category: { slug }`): este evaluador no lo soporta.
      const operators = ["in", "not", "gt", "gte", "lt", "lte", "contains", "some", "isNot", "notIn"];
      if (!operators.some((operator) => operator in c)) throw new Error(`support-test-db: filtro no soportado sobre "${key}"`);
    }
    return Object.entries(c).every(([operator, operand]) => {
      switch (operator) {
        case "in":
          return (operand as unknown[]).includes(value);
        case "notIn":
          return !(operand as unknown[]).includes(value);
        case "not":
          return operand === null ? value !== null && value !== undefined : value !== operand;
        case "gt":
          return value instanceof Date && value.getTime() > (operand as Date).getTime();
        case "gte":
          return value instanceof Date && value.getTime() >= (operand as Date).getTime();
        case "lt":
          return value instanceof Date && value.getTime() < (operand as Date).getTime();
        case "lte":
          return value instanceof Date && value.getTime() <= (operand as Date).getTime();
        case "contains":
          return typeof value === "string" && value.toLowerCase().includes(String(operand).toLowerCase());
        case "mode":
          return true;
        default:
          throw new Error(`support-test-db: operador no soportado "${operator}" sobre "${key}"`);
      }
    });
  });
}

let sequence = 0;
export const newId = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;

class Table {
  rows: Row[] = [];
  constructor(
    private readonly defaults: () => Row = () => ({}),
    private readonly hydrate: (row: Row, include?: Row) => Row = (row) => row,
  ) {}

  private out(row: Row, include?: Row): Row {
    return this.hydrate({ ...row }, include);
  }

  async findMany(args: { where?: Row; orderBy?: Row | Row[]; take?: number; skip?: number; include?: Row; select?: Row } = {}) {
    await Promise.resolve(); // cede el turno: permite probar carreras reales entre llamadas
    let result = this.rows.filter((row) => matches(row, args.where));
    const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : [];
    for (const order of [...orders].reverse()) {
      const [field, direction] = Object.entries(order)[0] as [string, "asc" | "desc"];
      result = [...result].sort((a, b) => {
        const av = a[field] instanceof Date ? (a[field] as Date).getTime() : (a[field] as number | string);
        const bv = b[field] instanceof Date ? (b[field] as Date).getTime() : (b[field] as number | string);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return direction === "desc" ? -cmp : cmp;
      });
    }
    if (args.skip) result = result.slice(args.skip);
    if (args.take !== undefined) result = result.slice(0, args.take);
    return result.map((row) => this.out(row, args.include ?? args.select));
  }

  async findFirst(args: { where?: Row; orderBy?: Row | Row[]; include?: Row; select?: Row } = {}) {
    return (await this.findMany({ ...args, take: 1 }))[0] ?? null;
  }
  async findUnique(args: { where: Row; include?: Row; select?: Row }) {
    return this.findFirst(args);
  }
  async findUniqueOrThrow(args: { where: Row; include?: Row; select?: Row }) {
    const row = await this.findUnique(args);
    if (!row) throw new Error("support-test-db: no encontrado");
    return row;
  }
  async count(args: { where?: Row } = {}) {
    await Promise.resolve();
    return this.rows.filter((row) => matches(row, args.where)).length;
  }

  async create(args: { data: Row; include?: Row; select?: Row }) {
    await Promise.resolve();
    const row: Row = { id: newId(), createdAt: new Date(), updatedAt: new Date(), ...this.defaults(), ...args.data };
    this.rows.push(row);
    return this.out(row, args.include ?? args.select);
  }

  private apply(row: Row, data: Row) {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && !(value instanceof Date) && "increment" in (value as Row)) {
        row[key] = ((row[key] as number) ?? 0) + ((value as Row).increment as number);
      } else if (value && typeof value === "object" && !(value instanceof Date) && ("connect" in (value as Row) || "disconnect" in (value as Row))) {
        // Relaciones (`assignedTo: { connect: { id } }`): el test mira el id plano.
        const rel = value as { connect?: { id: string }; disconnect?: boolean };
        row[`${key}Id`] = rel.connect?.id ?? null;
      } else {
        row[key] = value;
      }
    }
    row.updatedAt = new Date();
  }

  async updateMany(args: { where?: Row; data: Row }) {
    await Promise.resolve();
    // La comparación y la escritura ocurren en el mismo turno: es el candado atómico que da la base real.
    const targets = this.rows.filter((row) => matches(row, args.where));
    for (const row of targets) this.apply(row, args.data);
    return { count: targets.length };
  }
  async update(args: { where: Row; data: Row; include?: Row; select?: Row }) {
    await Promise.resolve();
    const row = this.rows.find((candidate) => matches(candidate, args.where));
    if (!row) throw new Error("support-test-db: update sobre una fila inexistente");
    this.apply(row, args.data);
    return this.out(row, args.include ?? args.select);
  }
  async deleteMany(args: { where?: Row } = {}) {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => !matches(row, args.where));
    return { count: before - this.rows.length };
  }
  async groupBy(args: { by: string[]; where?: Row }) {
    const groups = new Map<string, Row>();
    for (const row of this.rows.filter((candidate) => matches(candidate, args.where))) {
      const key = args.by.map((field) => String(row[field])).join("|");
      const existing = groups.get(key);
      if (existing) (existing._count as { _all: number })._all += 1;
      else groups.set(key, { ...Object.fromEntries(args.by.map((field) => [field, row[field]])), _count: { _all: 1 } });
    }
    return [...groups.values()];
  }
}

export function createFakeDb() {
  const users: Table = new Table(() => ({ role: "USER", deletedAt: null }));
  const categories: Table = new Table(() => ({ isActive: true, defaultPriority: "NORMAL", position: 0 }));
  const orders: Table = new Table();
  const businesses: Table = new Table();
  const adminActionLog = new Table();

  const tickets: Table = new Table(
    () => ({
      kind: "CUSTOMER",
      status: "NEW",
      priority: "NORMAL",
      assignedAgentId: null,
      customerId: null,
      orderId: null,
      businessId: null,
      escalatedFromBot: false,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenCount: 0,
      lastCustomerMessageAt: null,
      lastAgentMessageAt: null,
      number: 1000 + ++sequence,
    }),
    (row) => ({
      ...row,
      // Relaciones que los servicios piden con `select`: se arman siempre (superset).
      category: categories.rows.find((c) => c.id === row.categoryId) ?? { slug: "otro", name: "Otro" },
      customer: users.rows.find((u) => u.id === row.customerId) ?? null,
      assignedAgent: users.rows.find((u) => u.id === row.assignedAgentId) ?? null,
      order: orders.rows.find((o) => o.id === row.orderId) ?? null,
      business: businesses.rows.find((b) => b.id === row.businessId) ?? null,
      conversation: {
        ...(conversations.rows.find((c) => c.id === row.conversationId) ?? {}),
        messages: messages.rows
          .filter((m) => m.conversationId === row.conversationId && m.visibility === "PUBLIC")
          .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
          .slice(0, 1),
      },
    }),
  );

  const messages: Table = new Table(() => ({ visibility: "PUBLIC", redacted: false, metadata: null, senderId: null }), (row) => ({
    ...row,
    sender: users.rows.find((u) => u.id === row.senderId) ?? null,
  }));

  const conversations: Table = new Table(
    () => ({ userId: null, status: "BOT", rating: null, ratingComment: null, ratedAt: null, escalatedAt: null, resolvedAt: null, assignedToId: null, summary: null, escalationReason: null, guestName: null, guestEmail: null, lastMessageAt: new Date() }),
    (row, include) => {
      // El `where` de `include.messages` SE RESPETA (igual que Prisma): si el servicio del cliente
      // dejara de pedir solo lo PÚBLICO, las notas internas aparecerían y los tests de fuga fallarían.
      const config = (include?.messages ?? {}) as { where?: Row; orderBy?: Row; take?: number };
      let own = messages.rows.filter((m) => m.conversationId === row.id && matches(m, config.where));
      const [field, direction] = Object.entries(config.orderBy ?? { createdAt: "asc" })[0] as [string, "asc" | "desc"];
      own = [...own].sort((a, b) => {
        const cmp = (a[field] as Date).getTime() - (b[field] as Date).getTime();
        return direction === "desc" ? -cmp : cmp;
      });
      if (config.take !== undefined) own = own.slice(0, config.take);
      return {
        ...row,
        messages: own.map((m) => ({ ...m, sender: users.rows.find((u) => u.id === m.senderId) ?? null })),
        ticket: tickets.rows.find((t) => t.conversationId === row.id) ?? null,
        user: users.rows.find((u) => u.id === row.userId) ?? null,
      };
    },
  );

  const prisma = {
    user: users,
    supportCategory: categories,
    supportTicket: tickets,
    supportMessage: messages,
    supportConversation: conversations,
    order: orders,
    business: businesses,
    adminActionLog,
  };

  return { prisma, users, categories, tickets, messages, conversations, orders, businesses };
}

export type FakeDb = ReturnType<typeof createFakeDb>;

/** Atajos para armar escenarios. */
export function seedStaff(db: FakeDb) {
  const agentA = db.users.rows[db.users.rows.push({ id: newId(), name: "Ana Agente", email: "ana@mimo.sv", role: "SUPPORT_AGENT", deletedAt: null }) - 1]!;
  const agentB = db.users.rows[db.users.rows.push({ id: newId(), name: "Beto Agente", email: "beto@mimo.sv", role: "SUPPORT_AGENT", deletedAt: null }) - 1]!;
  const manager = db.users.rows[db.users.rows.push({ id: newId(), name: "Marta Supervisora", email: "marta@mimo.sv", role: "SUPPORT_MANAGER", deletedAt: null }) - 1]!;
  const admin = db.users.rows[db.users.rows.push({ id: newId(), name: "Admin", email: "admin@mimo.sv", role: "ADMIN", deletedAt: null }) - 1]!;
  const customer = db.users.rows[db.users.rows.push({ id: newId(), name: "Carla Cliente", email: "carla@correo.com", role: "USER", deletedAt: null }) - 1]!;
  const otherCustomer = db.users.rows[db.users.rows.push({ id: newId(), name: "Otro Cliente", email: "otro@correo.com", role: "USER", deletedAt: null }) - 1]!;
  const category = db.categories.rows[db.categories.rows.push({ id: newId(), slug: "otro", name: "Otro", defaultPriority: "NORMAL", isActive: true, position: 12 }) - 1]!;
  return {
    agentA: agentA as { id: string },
    agentB: agentB as { id: string },
    manager: manager as { id: string },
    admin: admin as { id: string },
    customer: customer as { id: string },
    otherCustomer: otherCustomer as { id: string },
    category: category as { id: string },
  };
}

/** Conversación (escalada) + ticket, con un par de mensajes públicos. */
export async function seedTicket(
  db: FakeDb,
  seed: ReturnType<typeof seedStaff>,
  overrides: { status?: string; assignedAgentId?: string | null; customerId?: string | null; conversation?: Row } = {},
) {
  const conversation = await db.conversations.create({
    data: { userId: overrides.customerId === undefined ? seed.customer.id : overrides.customerId, status: "WAITING_AGENT", escalatedAt: new Date(), ...overrides.conversation },
  });
  await db.messages.create({ data: { conversationId: conversation.id, role: "USER", body: "Mi pedido no llegó", createdAt: new Date(Date.now() - 60_000) } });
  const ticket = await db.tickets.create({
    data: {
      conversationId: conversation.id,
      customerId: overrides.customerId === undefined ? seed.customer.id : overrides.customerId,
      categoryId: seed.category.id,
      subject: "Mi pedido no llegó",
      source: "CHATBOT",
      status: overrides.status ?? "NEW",
      assignedAgentId: overrides.assignedAgentId ?? null,
      lastCustomerMessageAt: new Date(Date.now() - 60_000),
    },
  });
  return { conversation: conversation as Row & { id: string }, ticket: ticket as Row & { id: string } };
}
