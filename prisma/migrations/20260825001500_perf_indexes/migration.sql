-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_saleId_idx" ON "Payment"("saleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");
