-- CreateTable
CREATE TABLE "HeldTicket" (
    "id" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "note" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeldTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeldTicket_cashierId_createdAt_idx" ON "HeldTicket"("cashierId", "createdAt");

ALTER TABLE "HeldTicket" ADD CONSTRAINT "HeldTicket_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HeldTicket" ADD CONSTRAINT "HeldTicket_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Front-line roles can refund from the POS (permission already existed, unused).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.slug IN ('caissier', 'manager', 'admin', 'super-admin', 'vendeur')
  AND p.code = 'sales.refund'
ON CONFLICT DO NOTHING;
