import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { applyCatalogHygiene } from "../src/services/catalog-hygiene.service";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const soft = process.argv.includes("--soft");

async function main() {
  const result = await applyCatalogHygiene();
  console.log(
    `Catalogue nettoyé : ${result.renamed} nom(s), ${result.unpublished} fiche(s) dépubliée(s), ${result.merged} fusion(s), ${result.brands} marque(s), ${result.barcodes} GTIN, ${result.sheets} fiche(s) phares, ${result.featured} vedettes.`,
  );
}

main()
  .catch((err) => {
    if (soft) {
      console.warn("cleanup-live-catalog: échec, le build continue", err);
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
