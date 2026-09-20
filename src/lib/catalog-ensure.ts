import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { catalogParentsAreInstalled, syncNeraCatalog } from "@/lib/catalog";
import { applyCatalogHygiene } from "@/services/catalog-hygiene.service";

let catalogEnsure: Promise<boolean> | null = null;
let lastHygieneAt = 0;
const HYGIENE_EVERY_MS = 6 * 60 * 60 * 1000;

/** Installe Homme et les autres rayons NERA s’ils manquent encore en base. */
export async function ensureNeraCatalog() {
  if (!catalogEnsure) {
    catalogEnsure = (async () => {
      try {
        const parents = await prisma.category.findMany({
          where: { parentId: null, isActive: true, deletedAt: null },
          select: { slug: true },
        });
        if (catalogParentsAreInstalled(parents.map((row) => row.slug))) return true;
        await syncNeraCatalog(prisma);
        return true;
      } catch (err) {
        catalogEnsure = null;
        console.error("ensureNeraCatalog", err);
        return false;
      }
    })();
  }
  return catalogEnsure;
}

async function maybeApplyCatalogHygiene() {
  const now = Date.now();
  if (now - lastHygieneAt < HYGIENE_EVERY_MS) return;
  lastHygieneAt = now;
  try {
    await applyCatalogHygiene();
  } catch (err) {
    lastHygieneAt = 0;
    console.error("catalogHygiene", err);
  }
}

/** Ne bloque pas l’affichage des pastilles : le sync se fait après la réponse. */
export function scheduleEnsureNeraCatalog() {
  try {
    after(() => {
      void ensureNeraCatalog();
      void maybeApplyCatalogHygiene();
    });
  } catch {
    void ensureNeraCatalog();
    void maybeApplyCatalogHygiene();
  }
}
