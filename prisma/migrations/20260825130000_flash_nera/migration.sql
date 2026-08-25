-- AlterTable
ALTER TABLE "Product" ADD COLUMN "flashStartAt" TIMESTAMP(3),
ADD COLUMN "flashEndAt" TIMESTAMP(3);

CREATE INDEX "Product_flashEndAt_idx" ON "Product"("flashEndAt");

CREATE INDEX "Product_status_onlineVisible_flashEndAt_idx"
ON "Product"("status", "onlineVisible", "flashEndAt");
