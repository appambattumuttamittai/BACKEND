-- CreateTable
CREATE TABLE "Archive" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderCount" INTEGER NOT NULL,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "csvData" TEXT NOT NULL,
    "telegramMsgId" INTEGER,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Archive_createdAt_idx" ON "Archive"("createdAt");
