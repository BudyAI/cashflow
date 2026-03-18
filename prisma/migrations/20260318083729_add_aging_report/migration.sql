-- CreateTable
CREATE TABLE "AgingReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "days1to30" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "days31to60" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "days61to90" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "days90plus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgingReport_userId_reportDate_idx" ON "AgingReport"("userId", "reportDate");

-- AddForeignKey
ALTER TABLE "AgingReport" ADD CONSTRAINT "AgingReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
