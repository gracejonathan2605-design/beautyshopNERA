-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "ProductImage" ADD COLUMN "durationSeconds" INTEGER;
