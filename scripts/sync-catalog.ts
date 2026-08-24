import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { syncNeraCatalog } from "../src/lib/catalog";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const ids = await syncNeraCatalog(prisma);
  console.log(`Catalogue NERA synchronisé : ${Object.keys(ids).length} rayons.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
