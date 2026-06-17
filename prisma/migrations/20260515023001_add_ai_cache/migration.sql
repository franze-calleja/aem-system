-- CreateTable
CREATE TABLE "AICache" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AICache_contentHash_key" ON "AICache"("contentHash");

-- CreateIndex
CREATE INDEX "AICache_kind_createdAt_idx" ON "AICache"("kind", "createdAt");
