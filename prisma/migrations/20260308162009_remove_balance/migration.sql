/*
  Warnings:

  - You are about to drop the column `balance` on the `Transaction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "uploadBatchId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "originalDescription" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "categoryId" TEXT,
    "categoryConfidence" REAL,
    "classifiedBy" TEXT NOT NULL DEFAULT 'pending',
    "manuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideHistory" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryConfidence", "categoryId", "classifiedBy", "createdAt", "date", "description", "id", "manuallyOverridden", "originalDescription", "overrideHistory", "updatedAt", "uploadBatchId", "userId") SELECT "amount", "categoryConfidence", "categoryId", "classifiedBy", "createdAt", "date", "description", "id", "manuallyOverridden", "originalDescription", "overrideHistory", "updatedAt", "uploadBatchId", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");
CREATE INDEX "Transaction_uploadBatchId_idx" ON "Transaction"("uploadBatchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
