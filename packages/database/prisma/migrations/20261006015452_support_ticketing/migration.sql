-- CreateEnum
CREATE TYPE "SupportMessageVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_BUSINESS', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportTicketSource" AS ENUM ('CHATBOT', 'CUSTOMER_REQUEST', 'FORM', 'STAFF');

-- CreateEnum
CREATE TYPE "SupportTicketKind" AS ENUM ('CUSTOMER', 'BUSINESS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPPORT_AGENT';
ALTER TYPE "UserRole" ADD VALUE 'SUPPORT_MANAGER';

-- AlterTable
ALTER TABLE "support_conversations" ADD COLUMN     "ratedAt" TIMESTAMP(3),
ADD COLUMN     "ratingComment" TEXT;

-- AlterTable
ALTER TABLE "support_messages" ADD COLUMN     "redacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" "SupportMessageVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "support_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPriority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "firstResponseMinutes" INTEGER,
    "resolutionMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_macros" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "categoryId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_macros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "kind" "SupportTicketKind" NOT NULL DEFAULT 'CUSTOMER',
    "conversationId" UUID NOT NULL,
    "customerId" UUID,
    "orderId" UUID,
    "businessId" UUID,
    "assignedAgentId" UUID,
    "categoryId" UUID NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT NOT NULL,
    "source" "SupportTicketSource" NOT NULL,
    "escalatedFromBot" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "lastCustomerMessageAt" TIMESTAMP(3),
    "lastAgentMessageAt" TIMESTAMP(3),
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_categories_slug_key" ON "support_categories"("slug");

-- CreateIndex
CREATE INDEX "support_macros_isActive_idx" ON "support_macros"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_number_key" ON "support_tickets"("number");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_conversationId_key" ON "support_tickets"("conversationId");

-- CreateIndex
CREATE INDEX "support_tickets_kind_status_updatedAt_idx" ON "support_tickets"("kind", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_assignedAgentId_status_idx" ON "support_tickets"("assignedAgentId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_customerId_idx" ON "support_tickets"("customerId");

-- CreateIndex
CREATE INDEX "support_tickets_orderId_idx" ON "support_tickets"("orderId");

-- CreateIndex
CREATE INDEX "support_tickets_businessId_idx" ON "support_tickets"("businessId");

-- CreateIndex
CREATE INDEX "support_tickets_categoryId_idx" ON "support_tickets"("categoryId");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "support_tickets_updatedAt_idx" ON "support_tickets"("updatedAt");

-- AddForeignKey
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Datos iniciales y relleno (no modifican ninguna fila existente de soporte)
-- ─────────────────────────────────────────────────────────────────────────

-- Categorías iniciales (la tabla permite agregar/desactivar más desde el panel).
INSERT INTO "support_categories" ("id", "slug", "name", "description", "defaultPriority", "position", "updatedAt") VALUES
  (gen_random_uuid(), 'pedido',          'Pedido',            'Consultas sobre un pedido (contenido, estado, errores).',          'NORMAL', 1,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'entrega',         'Entrega',           'El pedido no llegó, llegó tarde o hay un problema con la entrega.', 'HIGH',   2,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'pago',            'Pago',              'Cobros, pagos rechazados o dudas sobre un pago.',                   'HIGH',   3,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'reembolso',       'Reembolso',         'Solicitudes de reembolso o devolución de dinero.',                  'HIGH',   4,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'cancelacion',     'Cancelación',       'Cancelar o modificar un pedido.',                                   'NORMAL', 5,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'negocio',         'Negocio',           'Problemas o consultas sobre un negocio.',                           'NORMAL', 6,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'cuenta',          'Cuenta',            'Acceso, datos personales o cambios en la cuenta.',                  'NORMAL', 7,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'cupon',           'Cupón',             'Cupones que no funcionan o dudas sobre descuentos.',                'LOW',    8,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'promocion',       'Promoción',         'Promociones y ofertas.',                                            'LOW',    9,  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'problema_tecnico','Problema técnico',  'Errores o fallas del sitio o de la app.',                           'NORMAL', 10, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'seguridad',       'Seguridad',         'Fraude, accesos no autorizados o datos comprometidos.',             'URGENT', 11, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'otro',            'Otro',              'Cualquier otra consulta.',                                          'NORMAL', 12, CURRENT_TIMESTAMP);

-- Cada conversación que ya se había escalado a una persona pasa a tener su ticket.
-- Las que solo atendió el asistente (BOT / resueltas sin escalar) NO generan ticket.
-- No se modifica ni se borra nada en support_conversations ni support_messages.
INSERT INTO "support_tickets" (
  "id", "kind", "conversationId", "customerId", "assignedAgentId", "categoryId",
  "status", "priority", "subject", "source", "escalatedFromBot",
  "firstResponseAt", "resolvedAt", "lastCustomerMessageAt", "lastAgentMessageAt",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'CUSTOMER',
  c."id",
  c."userId",
  c."assignedToId",
  (SELECT "id" FROM "support_categories" WHERE "slug" = 'otro'),
  CASE
    WHEN c."status" = 'WAITING_AGENT' THEN 'NEW'
    WHEN c."status" = 'WITH_AGENT' AND c."assignedToId" IS NOT NULL THEN 'IN_PROGRESS'
    WHEN c."status" = 'WITH_AGENT' THEN 'OPEN'
    ELSE 'RESOLVED'
  END::"SupportTicketStatus",
  'NORMAL',
  LEFT(COALESCE(NULLIF(BTRIM(c."escalationReason"), ''), 'Consulta de soporte'), 120),
  'CHATBOT',
  true,
  (SELECT MIN(m."createdAt") FROM "support_messages" m WHERE m."conversationId" = c."id" AND m."role" = 'AGENT'),
  CASE WHEN c."status" = 'RESOLVED' THEN COALESCE(c."resolvedAt", c."updatedAt") END,
  (SELECT MAX(m."createdAt") FROM "support_messages" m WHERE m."conversationId" = c."id" AND m."role" = 'USER'),
  (SELECT MAX(m."createdAt") FROM "support_messages" m WHERE m."conversationId" = c."id" AND m."role" = 'AGENT'),
  COALESCE(c."escalatedAt", c."createdAt"),
  c."updatedAt"
FROM "support_conversations" c
WHERE c."escalatedAt" IS NOT NULL
  AND c."status" IN ('WAITING_AGENT', 'WITH_AGENT', 'RESOLVED')
ORDER BY COALESCE(c."escalatedAt", c."createdAt") ASC;
