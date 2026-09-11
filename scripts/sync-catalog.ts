import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { catalogParentsAreInstalled, syncNeraCatalog } from "../src/lib/catalog";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const soft = process.argv.includes("--soft");

async function main() {
  const parents = await prisma.category.findMany({
    where: { parentId: null, isActive: true, deletedAt: null },
    select: { slug: true },
  });
  if (catalogParentsAreInstalled(parents.map((row) => row.slug))) {
    console.log("Catalogue NERA déjà à jour.");
    return;
  }
  const ids = await syncNeraCatalog(prisma);
  console.log(`Catalogue NERA synchronisé : ${Object.keys(ids).length} rayons.`);
}

main()
  .catch((err) => {
    if (soft) {
      console.warn("sync-catalog: échec, le site affichera quand même les rayons NERA", err);
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
