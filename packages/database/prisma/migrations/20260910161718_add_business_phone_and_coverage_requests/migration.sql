-- CreateEnum
CREATE TYPE "CoverageRequestStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "coverage_requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "municipalityId" UUID NOT NULL,
    "userId" UUID,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" "CoverageRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coverage_requests_businessId_idx" ON "coverage_requests"("businessId");

-- CreateIndex
CREATE INDEX "coverage_requests_municipalityId_idx" ON "coverage_requests"("municipalityId");

-- CreateIndex
CREATE INDEX "coverage_requests_status_idx" ON "coverage_requests"("status");

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
