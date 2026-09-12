-- CreateEnum
CREATE TYPE "PaymentSplitStatus" AS ENUM ('PENDING', 'PAID_OUT', 'PAYOUT_FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "paypalEmail" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "providerOrderId" TEXT;

-- CreateTable
CREATE TABLE "payment_splits" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentSplitStatus" NOT NULL DEFAULT 'PENDING',
    "payoutReference" TEXT,
    "refundReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_splits_businessId_idx" ON "payment_splits"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_splits_paymentId_businessId_key" ON "payment_splits"("paymentId", "businessId");

-- AddForeignKey
ALTER TABLE "payment_splits" ADD CONSTRAINT "payment_splits_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_splits" ADD CONSTRAINT "payment_splits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
