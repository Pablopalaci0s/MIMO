-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('BOT', 'WAITING_AGENT', 'WITH_AGENT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SupportMessageRole" AS ENUM ('USER', 'BOT', 'AGENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_MESSAGE';

-- CreateTable
CREATE TABLE "support_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'BOT',
    "summary" TEXT,
    "escalationReason" TEXT,
    "assignedToId" UUID,
    "rating" INTEGER,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "SupportMessageRole" NOT NULL,
    "body" TEXT NOT NULL,
    "senderId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_conversations_status_lastMessageAt_idx" ON "support_conversations"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "support_conversations_userId_status_idx" ON "support_conversations"("userId", "status");

-- CreateIndex
CREATE INDEX "support_messages_conversationId_createdAt_idx" ON "support_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
