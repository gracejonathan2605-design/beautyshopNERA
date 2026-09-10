import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { applyCatalogHygiene } from "../src/services/catalog-hygiene.service";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const result = await applyCatalogHygiene();
  console.log(
    `Catalogue nettoyé : ${result.renamed} nom(s), ${result.unpublished} fiche(s) dépubliée(s), ${result.sheets} fiche(s) phares, ${result.featured} vedettes.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
