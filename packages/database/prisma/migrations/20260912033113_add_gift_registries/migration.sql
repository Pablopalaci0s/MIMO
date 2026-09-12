-- CreateTable
CREATE TABLE "gift_registries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT,
    "eventDate" TIMESTAMP(3),
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_registry_items" (
    "id" UUID NOT NULL,
    "registryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "note" TEXT,
    "reservedByName" TEXT,
    "reservedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_registry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_registries_slug_key" ON "gift_registries"("slug");

-- CreateIndex
CREATE INDEX "gift_registries_userId_idx" ON "gift_registries"("userId");

-- CreateIndex
CREATE INDEX "gift_registry_items_registryId_idx" ON "gift_registry_items"("registryId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_registry_items_registryId_productId_key" ON "gift_registry_items"("registryId", "productId");

-- AddForeignKey
ALTER TABLE "gift_registries" ADD CONSTRAINT "gift_registries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_registry_items" ADD CONSTRAINT "gift_registry_items_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "gift_registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_registry_items" ADD CONSTRAINT "gift_registry_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
