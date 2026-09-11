import type { Prisma, PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/pricing";

export type CatalogChild = { name: string; slug: string };
export type CatalogGroup = { name: string; slug: string; children: CatalogChild[] };

function child(parentSlug: string, name: string): CatalogChild {
  return { name, slug: `${parentSlug}-${slugify(name)}` };
}

function group(name: string, children: string[]): CatalogGroup {
  const slug = slugify(name);
  return { name, slug, children: children.map((n) => child(slug, n)) };
}

/** Rayons NERA Beauté & Shop — parents = navigation boutique, enfants = choix à la création. */
export const NERA_CATALOG: CatalogGroup[] = [
  group("Cosmétiques & soins", [
    "Lait corporel",
    "Beurre corporel",
    "Huile corporelle",
    "Crème corporelle",
    "Gommages corps",
    "Savons",
    "Gel douche",
    "Déodorants",
    "Brumes corporelles",
    "Crème pour les mains",
    "Crème pour les pieds",
    "Lotion",
    "Sérums corps",
    "Soins spécifiques",
    "Beurre de karité",
    "Huile de coco",
    "Anti-vergetures",
    "Soins intimes",
    "Écran solaire corps",
  ]),
  group("Soins du visage", [
    "Nettoyant visage",
    "Gommage visage",
    "Masques",
    "Lotion tonique",
    "Eau micellaire",
    "Crème solaire visage",
    "Crème hydratante",
    "Sérums visage",
    "Contour des yeux",
    "Produits anti-acné",
    "Produits anti-comédons",
    "Produits anti-taches",
    "Soins éclaircissants",
    "Démaquillants",
    "Baume à lèvres",
  ]),
  group("Mèches, perruques & extensions", [
    "Mèches brésiliennes",
    "Mèches du Nigeria",
    "Mèches Crystal",
    "X-Pression",
    "Mèches diverses",
    "Perruques",
    "Frontales",
    "Closures",
    "Ponytails",
    "Bonnets",
    "Bonnets pour perruques",
    "Colle pour perruques",
    "Produits d’entretien perruques et extensions",
    "Autres types de mèches",
  ]),
  group("Soins capillaires", [
    "Shampoings",
    "Masques capillaires",
    "Conditionneurs",
    "Huiles pour cheveux",
    "Sérums capillaires",
    "Crèmes leave-in",
    "Gels",
    "Edge control",
    "Produits d’entretien cheveux nappy",
    "Produits pour cheveux et extensions",
    "Défrisants et relaxers",
    "Teintures et colorations",
    "Bonnets et accessoires cheveux",
    "Peignes",
    "Brosses",
    "Perles",
    "Chichis",
    "Décorations pour cheveux",
    "Foulards et turbans",
  ]),
  group("Maquillage", [
    "Fond de teint",
    "Correcteurs",
    "Poudre",
    "Blush",
    "Highlighter",
    "Palettes de fards",
    "Eyeliners",
    "Mascara",
    "Crayons",
    "Gloss",
    "Rouges à lèvres",
    "Faux cils",
    "Colle à faux cils",
    "Éponges maquillage",
    "Pinceaux",
    "Accessoires de maquillage",
    "Primer",
    "Spray fixateur",
  ]),
  group("Parfumerie", [
    "Parfums femme",
    "Parfums enfant",
    "Brumes parfumées",
    "Huiles parfumées",
    "Coffrets parfum",
    "Sacs parfum",
    "Parfums de poche",
  ]),
  group("Homme", [
    "Parfums",
    "Déodorants",
    "Gel douche",
    "Soins visage",
    "Crème de rasage",
    "Mousse et gel de rasage",
    "Après-rasage",
    "Rasoirs et lames",
    "Huile pour barbe",
    "Baume pour barbe",
    "Shampoing barbe",
    "Hygiène intime",
    "Ceintures",
    "Coffrets",
  ]),
  group("Accessoires & bijoux", [
    "Montres",
    "Lunettes de soleil",
    "Accessoires cheveux",
    "Bijoux de tête",
    "Porte-clés",
    "Ceintures femme",
    "Chapeaux",
    "Accessoires de mode",
    "Bijoux",
    "Bijoux de poche",
  ]),
  group("Mode", [
    "Sacs",
    "Sacs à main",
    "Chaussures",
    "Sandales",
    "Lingerie",
  ]),
  group("Articles divers", [
    "Miroirs de poche",
    "Trousses de maquillage",
    "Trousses de toilette",
    "Trousses de beauté",
    "Éponges",
    "Pinces",
    "Coton et disques",
  ]),
  group("Hygiène buccale", [
    "Dentifrice",
    "Bain de bouche",
    "Brosse à dents",
    "Colgate",
    "Fil dentaire",
  ]),
  group("Ongles", [
    "Vernis",
    "Faux ongles",
    "Dissolvant",
    "Kits manucure",
    "Lime et accessoires ongles",
  ]),
  group("Bien-être", [
    "Vaseline",
    "Compléments alimentaires",
    "Soins bébé",
    "Hygiène intime",
    "Gel hydroalcoolique",
  ]),
];

export function catalogSlugs() {
  return NERA_CATALOG.flatMap((g) => [g.slug, ...g.children.map((c) => c.slug)]);
}

type Db = PrismaClient | Prisma.TransactionClient;

export const LINGERIE_SLUG = "mode-lingerie";
export const CLOSURES_SLUG = "meches-perruques-extensions-closures";
export const HOMME_SLUG = "homme";

/** Range une fiche déjà dans Mode / Mèches vers Lingerie ou Closures, sans toucher aux autres rayons. */
export function catalogShelfHint(name: string): typeof LINGERIE_SLUG | typeof CLOSURES_SLUG | null {
  const hay = String(name ?? "").toLowerCase();
  if (/\blingerie\b/.test(hay) || /\bsous-v[eê]tements?\b/.test(hay)) return LINGERIE_SLUG;
  if (/\bclosures?\b/.test(hay)) return CLOSURES_SLUG;
  return null;
}

export function catalogHommeShelfHint(name: string): string | null {
  const hay = String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\blingerie\b/.test(hay) || /\bsous-vetements?\b/.test(hay)) return null;
  if (/\bfemme\b/.test(hay) && !/\bhommes?\b/.test(hay)) return null;
  if (/\bapres[-\s]?rasage\b/.test(hay) || /\bafter[\s-]?shave\b/.test(hay)) return "homme-apres-rasage";
  if (/\brasoir|\blames?\b/.test(hay)) return "homme-rasoirs-et-lames";
  if (/\b(mousse|gel)\s+(de\s+)?rasage\b/.test(hay)) return "homme-mousse-et-gel-de-rasage";
  if (/\bcreme\s+(de\s+)?rasage\b/.test(hay) || /\brasage\b/.test(hay)) return "homme-creme-de-rasage";
  if (/\bshampoing.{0,24}barbe\b/.test(hay)) return "homme-shampoing-barbe";
  if (/\bbaume.{0,24}barbe\b/.test(hay)) return "homme-baume-pour-barbe";
  if (/\bhuile.{0,24}barbe\b/.test(hay) || /\bbarbe\b/.test(hay)) return "homme-huile-pour-barbe";
  if (!/\bhommes?\b/.test(hay)) return null;
  if (/\bparfum/.test(hay)) return "homme-parfums";
  if (/\bdeo(dorant)?s?\b/.test(hay)) return "homme-deodorants";
  if (/\bgel douche\b/.test(hay)) return "homme-gel-douche";
  if (/\bceintures?\b/.test(hay)) return "homme-ceintures";
  if (/\b(intime|toilette)\b/.test(hay)) return "homme-hygiene-intime";
  if (/\bcoffrets?\b/.test(hay)) return "homme-coffrets";
  if (/\b(visage|creme|soin)\b/.test(hay)) return "homme-soins-visage";
  return null;
}

export function hommeTargetFromOldCategory(name: string, slug: string): string | null {
  const hay = `${name} ${slug}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!hay.includes("homme")) return null;
  if (/femme/.test(hay) && !/homme/.test(hay)) return null;
  if (/parfum/.test(hay)) return "homme-parfums";
  if (/ceinture/.test(hay)) return "homme-ceintures";
  if (/intime|toilette/.test(hay)) return "homme-hygiene-intime";
  if (/deodorant|deodorants/.test(hay)) return "homme-deodorants";
  if (/apres-rasage|aftershave/.test(hay)) return "homme-apres-rasage";
  if (/rasage/.test(hay)) return "homme-creme-de-rasage";
  if (/barbe/.test(hay)) return "homme-huile-pour-barbe";
  if (/coffret/.test(hay)) return "homme-coffrets";
  return null;
}

function slugsInGroup(parentSlug: string) {
  const group = NERA_CATALOG.find((item) => item.slug === parentSlug);
  if (!group) return [] as string[];
  return [group.slug, ...group.children.map((child) => child.slug)];
}

async function fileLingerieAndClosures(db: Db, ids: Record<string, string>) {
  const lingerieId = ids[LINGERIE_SLUG];
  const closuresId = ids[CLOSURES_SLUG];
  if (!lingerieId && !closuresId) return;

  const modeIds = new Set(slugsInGroup("mode").map((slug) => ids[slug]).filter(Boolean));
  const mecheIds = new Set(
    slugsInGroup("meches-perruques-extensions").map((slug) => ids[slug]).filter(Boolean),
  );

  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: "lingerie", mode: "insensitive" } },
        { name: { contains: "sous-vêtement", mode: "insensitive" } },
        { name: { contains: "sous-vetement", mode: "insensitive" } },
        { name: { contains: "closure", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, categoryId: true },
  });

  for (const product of products) {
    const hint = catalogShelfHint(product.name);
    const target = hint ? ids[hint] : undefined;
    if (!target || product.categoryId === target) continue;
    const allowed = hint === LINGERIE_SLUG ? modeIds : mecheIds;
    if (product.categoryId && !allowed.has(product.categoryId)) continue;
    await db.product.update({
      where: { id: product.id },
      data: { categoryId: target },
    });
  }
}

async function migrateHommeCategories(db: Db, ids: Record<string, string>) {
  const hommeId = ids[HOMME_SLUG];
  if (!hommeId) return;
  const hommeChildIds = new Set(slugsInGroup(HOMME_SLUG).map((slug) => ids[slug]).filter(Boolean));

  const rows = await db.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  for (const row of rows) {
    if (row.id === hommeId || hommeChildIds.has(row.id)) continue;
    const targetSlug = hommeTargetFromOldCategory(row.name, row.slug);
    const target = targetSlug ? ids[targetSlug] : undefined;
    if (!target) continue;
    await db.product.updateMany({
      where: { categoryId: row.id, deletedAt: null },
      data: { categoryId: target },
    });
    const remaining = await db.product.count({ where: { categoryId: row.id, deletedAt: null } });
    if (remaining === 0) {
      await db.category.update({
        where: { id: row.id },
        data: { isActive: false },
      });
    }
  }
}

async function fileHommeProducts(db: Db, ids: Record<string, string>) {
  if (!ids[HOMME_SLUG]) return;
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: "homme", mode: "insensitive" } },
        { name: { contains: "rasage", mode: "insensitive" } },
        { name: { contains: "barbe", mode: "insensitive" } },
        { name: { contains: "aftershave", mode: "insensitive" } },
        { name: { contains: "after shave", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, categoryId: true },
  });
  for (const product of products) {
    const hint = catalogHommeShelfHint(product.name);
    const target = hint ? ids[hint] : undefined;
    if (!target || product.categoryId === target) continue;
    await db.product.update({
      where: { id: product.id },
      data: { categoryId: target },
    });
  }
}

export async function syncNeraCatalog(db: Db) {
  const ids: Record<string, string> = {};
  for (const [index, g] of NERA_CATALOG.entries()) {
    const parent = await db.category.upsert({
      where: { slug: g.slug },
      update: {
        name: g.name,
        parentId: null,
        sortOrder: index,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: g.name,
        slug: g.slug,
        sortOrder: index,
        isActive: true,
      },
    });
    ids[g.slug] = parent.id;
    for (const [childIndex, c] of g.children.entries()) {
      const row = await db.category.upsert({
        where: { slug: c.slug },
        update: {
          name: c.name,
          parentId: parent.id,
          sortOrder: childIndex,
          isActive: true,
          deletedAt: null,
        },
        create: {
          name: c.name,
          slug: c.slug,
          parentId: parent.id,
          sortOrder: childIndex,
          isActive: true,
        },
      });
      ids[c.slug] = row.id;
    }
  }

  await migrateHommeCategories(db, ids);
  await fileHommeProducts(db, ids);

  const known = catalogSlugs();
  const unused = await db.category.findMany({
    where: {
      slug: { notIn: known },
      deletedAt: null,
      products: { none: {} },
    },
    select: { id: true },
  });
  if (unused.length) {
    await db.category.updateMany({
      where: { id: { in: unused.map((u) => u.id) } },
      data: { isActive: false },
    });
  }
  await fileLingerieAndClosures(db, ids);
  return ids;
}

export type CategoryOptionGroup = {
  label: string;
  parentId: string;
  children: { id: string; name: string }[];
};

export function groupCategoriesForSelect(
  rows: { id: string; name: string; parentId: string | null; sortOrder: number }[],
): CategoryOptionGroup[] {
  const parents = rows.filter((r) => !r.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr"));
  const children = rows.filter((r) => r.parentId);
  return parents.map((parent) => ({
    label: parent.name,
    parentId: parent.id,
    children: children
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr"))
      .map((c) => ({ id: c.id, name: c.name })),
  }));
}
