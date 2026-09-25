-- AlterEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'PAID');
CREATE TYPE "IntakeKind" AS ENUM ('PURCHASE', 'CONSIGNMENT');

-- AlterTable Brand
ALTER TABLE "Brand" ADD COLUMN "commissionBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Brand" ADD COLUMN "settlementDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "Brand" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactEmail" TEXT;

-- AlterTable Payment
ALTER TABLE "Payment" ADD COLUMN "proofUrl" TEXT;

-- CreateTable
CREATE TABLE "BrandIntake" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "kind" "IntakeKind" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandIntake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandIntakeLine" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    CONSTRAINT "BrandIntakeLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandSettlement" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "gross" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "neraShare" INTEGER NOT NULL,
    "brandShare" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestockRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    CONSTRAINT "RestockRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandIntake_brandId_createdAt_idx" ON "BrandIntake"("brandId", "createdAt");
CREATE INDEX "BrandSettlement_brandId_periodFrom_idx" ON "BrandSettlement"("brandId", "periodFrom");
CREATE INDEX "RestockRequest_productId_notifiedAt_idx" ON "RestockRequest"("productId", "notifiedAt");
CREATE INDEX "RestockRequest_phone_idx" ON "RestockRequest"("phone");

ALTER TABLE "BrandIntake" ADD CONSTRAINT "BrandIntake_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandIntakeLine" ADD CONSTRAINT "BrandIntakeLine_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "BrandIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandIntakeLine" ADD CONSTRAINT "BrandIntakeLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrandSettlement" ADD CONSTRAINT "BrandSettlement_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockRequest" ADD CONSTRAINT "RestockRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
