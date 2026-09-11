-- CreateEnum
CREATE TYPE "OrderMessageSender" AS ENUM ('CUSTOMER', 'BUSINESS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_MESSAGE';

-- CreateTable
CREATE TABLE "order_messages" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "senderRole" "OrderMessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_messages_orderId_businessId_idx" ON "order_messages"("orderId", "businessId");

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
