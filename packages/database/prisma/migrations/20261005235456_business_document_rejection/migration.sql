-- AlterTable
ALTER TABLE "business_documents" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" UUID,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "business_documents_rejectedById_idx" ON "business_documents"("rejectedById");

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
