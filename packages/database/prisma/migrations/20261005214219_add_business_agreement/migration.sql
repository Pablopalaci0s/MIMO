-- CreateTable
CREATE TABLE "business_agreement_acceptances" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "acceptedById" UUID,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_agreement_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_agreement_acceptances_acceptedById_idx" ON "business_agreement_acceptances"("acceptedById");

-- CreateIndex
CREATE UNIQUE INDEX "business_agreement_acceptances_businessId_version_key" ON "business_agreement_acceptances"("businessId", "version");

-- AddForeignKey
ALTER TABLE "business_agreement_acceptances" ADD CONSTRAINT "business_agreement_acceptances_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_agreement_acceptances" ADD CONSTRAINT "business_agreement_acceptances_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
