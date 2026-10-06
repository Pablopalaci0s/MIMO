-- Nombre de usuario del personal de soporte (se elige una sola vez).
-- Migración aditiva: dos columnas nuevas, NULL para todos los usuarios existentes.
ALTER TABLE "users" ADD COLUMN "supportUsername" TEXT;
ALTER TABLE "users" ADD COLUMN "supportUsernameSetAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_supportUsername_key" ON "users"("supportUsername");
