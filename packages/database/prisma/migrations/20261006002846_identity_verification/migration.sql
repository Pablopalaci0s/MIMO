-- AlterTable
ALTER TABLE "admin_action_logs" ALTER COLUMN "adminId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedDocuments" "BusinessDocumentType"[],
    "documentLegible" BOOLEAN NOT NULL,
    "documentValid" BOOLEAN NOT NULL,
    "identityMatches" BOOLEAN NOT NULL,
    "photoMatches" BOOLEAN NOT NULL,
    "duiLast4" TEXT NOT NULL,
    "duiFingerprint" TEXT NOT NULL,
    "fingerprintVersion" INTEGER NOT NULL DEFAULT 1,
    "imagesPurgeAfter" TIMESTAMP(3),
    "imagesDeletedAt" TIMESTAMP(3),

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_verifications_businessId_idx" ON "identity_verifications"("businessId");

-- CreateIndex
CREATE INDEX "identity_verifications_duiFingerprint_idx" ON "identity_verifications"("duiFingerprint");

-- CreateIndex
CREATE INDEX "identity_verifications_imagesPurgeAfter_idx" ON "identity_verifications"("imagesPurgeAfter");

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
