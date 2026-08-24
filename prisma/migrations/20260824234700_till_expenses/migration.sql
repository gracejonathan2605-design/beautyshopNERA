-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "cashSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_cashSessionId_idx" ON "Expense"("cashSessionId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
