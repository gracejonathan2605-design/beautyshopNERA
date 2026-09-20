import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { catalogParentsAreInstalled, syncNeraCatalog } from "@/lib/catalog";

let catalogEnsure: Promise<boolean> | null = null;

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

/** Ne bloque pas l’affichage des pastilles : le sync se fait après la réponse. */
export function scheduleEnsureNeraCatalog() {
  try {
    after(() => {
      void ensureNeraCatalog();
    });
  } catch {
    void ensureNeraCatalog();
  }
}
