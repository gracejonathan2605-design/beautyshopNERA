-- AlterTable
ALTER TABLE "Product" ADD COLUMN "flashStartAt" TIMESTAMP(3),
ADD COLUMN "flashEndAt" TIMESTAMP(3);

CREATE INDEX "Product_flashEndAt_idx" ON "Product"("flashEndAt");

CREATE INDEX "Product_status_onlineVisible_flashEndAt_idx"
ON "Product"("status", "onlineVisible", "flashEndAt");

-- Met en FLASH NERA les 8 nouveautés déjà en ligne, une seule fois, sans toucher au stock.
UPDATE "Product" AS p
SET
  "flashStartAt" = NOW(),
  "flashEndAt" = NOW() + INTERVAL '10 days'
FROM (
  SELECT id
  FROM "Product"
  WHERE "deletedAt" IS NULL
    AND "status" = 'ACTIVE'
    AND "onlineVisible" = true
    AND "flashStartAt" IS NULL
  ORDER BY "createdAt" DESC
  LIMIT 8
) AS recent
WHERE p.id = recent.id;
