-- CreateEnum
CREATE TYPE "GroupGiftStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroupGiftContributionStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "group_gifts" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "productId" UUID NOT NULL,
    "targetAmount" DECIMAL(10,2) NOT NULL,
    "deadline" TIMESTAMP(3),
    "organizerPaypalEmail" TEXT NOT NULL,
    "status" "GroupGiftStatus" NOT NULL DEFAULT 'OPEN',
    "payoutReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_gift_contributions" (
    "id" UUID NOT NULL,
    "groupGiftId" UUID NOT NULL,
    "contributorName" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "GroupGiftContributionStatus" NOT NULL DEFAULT 'PENDING',
    "paypalOrderId" TEXT,
    "captureId" TEXT,
    "refundReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_gift_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_gifts_slug_key" ON "group_gifts"("slug");

-- CreateIndex
CREATE INDEX "group_gifts_organizerId_idx" ON "group_gifts"("organizerId");

-- CreateIndex
CREATE INDEX "group_gift_contributions_groupGiftId_idx" ON "group_gift_contributions"("groupGiftId");

-- AddForeignKey
ALTER TABLE "group_gifts" ADD CONSTRAINT "group_gifts_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_gifts" ADD CONSTRAINT "group_gifts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_gift_contributions" ADD CONSTRAINT "group_gift_contributions_groupGiftId_fkey" FOREIGN KEY ("groupGiftId") REFERENCES "group_gifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
