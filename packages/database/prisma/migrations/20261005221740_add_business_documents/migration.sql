-- CreateEnum
CREATE TYPE "BusinessDocumentType" AS ENUM ('DUI_FRONT', 'DUI_BACK', 'OWNER_PHOTO', 'TAX_ID', 'PERMIT');

-- CreateTable
CREATE TABLE "business_documents" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "type" "BusinessDocumentType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_documents_uploadedById_idx" ON "business_documents"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "business_documents_businessId_type_key" ON "business_documents"("businessId", "type");

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
