-- REVERSIÓN de la migración `support_username` (Prisma no genera "down"; este
-- archivo NO lo ejecuta Prisma — se corre a mano con psql):
--
--   psql -v ON_ERROR_STOP=1 --single-transaction -f rollback.sql <base>
--
-- Solo quita las dos columnas y su índice. No toca ningún otro dato; se pierden
-- los nombres de usuario elegidos (el cliente volvería a ver el nombre de pila).
DROP INDEX "users_supportUsername_key";
ALTER TABLE "users" DROP COLUMN "supportUsernameSetAt";
ALTER TABLE "users" DROP COLUMN "supportUsername";
