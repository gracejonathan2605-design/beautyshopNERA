CREATE TYPE "PartnershipType" AS ENUM ('UNSET', 'WHOLESALE', 'CONSIGNMENT', 'COMMISSION', 'CATALOG', 'ON_DEMAND');
CREATE TYPE "StockOwner" AS ENUM ('NERA', 'PARTNER');
CREATE TYPE "BrandCollectionKind" AS ENUM ('ALL', 'NEW', 'FEATURED', 'BESTSELLERS', 'CATEGORY', 'MANUAL');

ALTER TABLE "Brand"
  ADD COLUMN "logo" TEXT,
  ADD COLUMN "banner" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showOnSite" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "partnershipType" "PartnershipType" NOT NULL DEFAULT 'UNSET',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Brand_isPartner_showOnSite_isActive_sortOrder_idx"
  ON "Brand"("isPartner", "showOnSite", "isActive", "sortOrder");

ALTER TABLE "Product"
  ADD COLUMN "stockOwner" "StockOwner" NOT NULL DEFAULT 'NERA';

CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

CREATE TABLE "BrandCollection" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "kind" "BrandCollectionKind" NOT NULL DEFAULT 'MANUAL',
  "categoryId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandCollection_brandId_slug_key" ON "BrandCollection"("brandId", "slug");
CREATE INDEX "BrandCollection_brandId_sortOrder_idx" ON "BrandCollection"("brandId", "sortOrder");

ALTER TABLE "BrandCollection"
  ADD CONSTRAINT "BrandCollection_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandCollection"
  ADD CONSTRAINT "BrandCollection_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BrandCollectionProduct" (
  "collectionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BrandCollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId")
);

ALTER TABLE "BrandCollectionProduct"
  ADD CONSTRAINT "BrandCollectionProduct_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "BrandCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandCollectionProduct"
  ADD CONSTRAINT "BrandCollectionProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nakae Beauté : nom, slug et texte fournis. Pas de logo, bannière ni produits fictifs.
DO $$
DECLARE
  keeper_id text;
  extra record;
BEGIN
  SELECT id INTO keeper_id
  FROM "Brand"
  WHERE slug IN ('nakae-beaute', 'nakae') OR name IN ('Nakae Beauté', 'Nakae')
  ORDER BY CASE WHEN slug = 'nakae-beaute' THEN 0 WHEN name = 'Nakae Beauté' THEN 1 ELSE 2 END
  LIMIT 1;

  IF keeper_id IS NOT NULL THEN
    UPDATE "Brand"
    SET
      name = 'Nakae Beauté',
      slug = 'nakae-beaute',
      "isPartner" = true,
      "showOnSite" = true,
      "isActive" = true,
      "deletedAt" = NULL,
      description = COALESCE(NULLIF(description, ''), 'Découvrez la sélection Nakae Beauté disponible chez NERA Beauté & Shop.')
    WHERE id = keeper_id;

    FOR extra IN
      SELECT id FROM "Brand"
      WHERE id <> keeper_id
        AND (slug IN ('nakae', 'nakae-beaute') OR name IN ('Nakae', 'Nakae Beauté'))
    LOOP
      UPDATE "Product" SET "brandId" = keeper_id WHERE "brandId" = extra.id;
      DELETE FROM "Brand" WHERE id = extra.id;
    END LOOP;
  ELSE
    INSERT INTO "Brand" (id, name, slug, "isPartner", "showOnSite", "isActive", "sortOrder", "partnershipType", description)
    VALUES (
      'nakae-beaute-partner',
      'Nakae Beauté',
      'nakae-beaute',
      true,
      true,
      true,
      1,
      'UNSET',
      'Découvrez la sélection Nakae Beauté disponible chez NERA Beauté & Shop.'
    );
  END IF;
END $$;
