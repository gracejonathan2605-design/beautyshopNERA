-- Unique OPEN cash session per register (partial index, not expressible in Prisma).
CREATE UNIQUE INDEX IF NOT EXISTS "CashSession_one_open_per_register"
ON "CashSession" ("registerId") WHERE status = 'OPEN';

DROP INDEX IF EXISTS "Product_status_onlineVisible_idx";
CREATE INDEX IF NOT EXISTS "Product_status_onlineVisible_deletedAt_idx"
ON "Product" ("status", "onlineVisible", "deletedAt");

CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_deletedAt_idx"
ON "ProductVariant" ("isActive", "deletedAt");

CREATE INDEX IF NOT EXISTS "Category_parentId_isActive_deletedAt_idx"
ON "Category" ("parentId", "isActive", "deletedAt");
