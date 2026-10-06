-- REVERSIÓN de la migración `support_ticketing` (Prisma no genera "down"; este
-- archivo NO lo ejecuta Prisma — se corre a mano con psql si hace falta volver
-- atrás):
--
--   psql -v ON_ERROR_STOP=1 --single-transaction -f rollback.sql <base>
--
-- Qué garantiza:
--   * Las conversaciones y mensajes ORIGINALES no se tocan (ni se borran ni se
--     modifican): solo se quitan las columnas y tablas que agregó la migración.
--   * Las NOTAS INTERNAS se borran ANTES de quitar la columna `visibility`: si
--     no, al desaparecer la columna pasarían a verse como mensajes normales
--     (y el cliente las vería).
--   * Se niega a correr si hay usuarios con roles de soporte (habría que
--     cambiarles el rol primero, o quedarían sin un rol válido).
--
-- Se pierde (por diseño, vive solo en lo que se revierte): los tickets, sus
-- números, las categorías, las macros, el comentario del CSAT y las notas internas.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role"::text IN ('SUPPORT_AGENT', 'SUPPORT_MANAGER')) THEN
    RAISE EXCEPTION 'Hay usuarios con rol SUPPORT_AGENT o SUPPORT_MANAGER: cambiales el rol (por ejemplo a USER) antes de revertir.';
  END IF;
END $$;

DROP TABLE "support_macros";
DROP TABLE "support_tickets";
DROP TABLE "support_categories";

-- Primero las notas internas (ver arriba), después la columna.
DELETE FROM "support_messages" WHERE "visibility" = 'INTERNAL';
ALTER TABLE "support_messages" DROP COLUMN "visibility", DROP COLUMN "redacted";
ALTER TABLE "support_conversations" DROP COLUMN "ratingComment", DROP COLUMN "ratedAt";

DROP TYPE "SupportTicketKind";
DROP TYPE "SupportTicketSource";
DROP TYPE "SupportTicketPriority";
DROP TYPE "SupportTicketStatus";
DROP TYPE "SupportMessageVisibility";

-- UserRole: Postgres no permite quitar valores de un enum; se recrea sin los dos de soporte.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('USER', 'BUSINESS', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "UserRole_old";

-- Que Prisma la considere no aplicada (si se vuelve a correr `migrate deploy` se re-aplica).
DELETE FROM "_prisma_migrations" WHERE "migration_name" LIKE '%_support_ticketing';
