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
    "Parfums homme",
    "Parfums enfant",
    "Brumes parfumées",
    "Huiles parfumées",
    "Coffrets parfum",
    "Sacs parfum",
    "Parfums de poche",
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
