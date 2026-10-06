-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "documentsPurgeAfter" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedVersion" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "canReviewDocuments" BOOLEAN NOT NULL DEFAULT false;

-- Los administradores que ya existen conservan el acceso a los documentos que
-- ya podian ver; de ahora en mas el permiso se otorga explicitamente.
UPDATE "users" SET "canReviewDocuments" = true WHERE "role" = 'ADMIN';
