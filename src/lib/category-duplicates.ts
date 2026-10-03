export type CategoryMergeRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  sortOrder: number;
};

export type CategoryMerge = {
  keeperId: string;
  duplicateIds: string[];
};

/** Même sous-rayon malgré la casse, les accents et les espaces. */
export function categoryNameTaken(
  rows: { id?: string; name: string }[],
  name: string,
  ignoreId?: string,
) {
  const key = categoryNameKey(name);
  if (!key) return false;
  return rows.some((row) => row.id !== ignoreId && categoryNameKey(row.name) === key);
}

export function categoryNameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function pickKeeper(group: CategoryMergeRow[], officialSlugs: ReadonlySet<string>) {
  return [...group].sort((a, b) => {
    const official = Number(officialSlugs.has(b.slug)) - Number(officialSlugs.has(a.slug));
    if (official) return official;
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.slug.length !== b.slug.length) return a.slug.length - b.slug.length;
    return a.id.localeCompare(b.id);
  })[0];
}

/** Fusionne les rayons actifs qui portent le même nom sous le même parent. */
export function planDuplicateCategoryMerges(
  rows: CategoryMergeRow[],
  officialSlugs: ReadonlySet<string> = new Set(),
): CategoryMerge[] {
  const byParent = new Map<string, CategoryMergeRow[]>();
  for (const row of rows) {
    const parentKey = row.parentId ?? "";
    const list = byParent.get(parentKey) ?? [];
    list.push(row);
    byParent.set(parentKey, list);
  }
  const plans: CategoryMerge[] = [];
  for (const siblings of byParent.values()) {
    const byName = new Map<string, CategoryMergeRow[]>();
    for (const row of siblings) {
      const key = categoryNameKey(row.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push(row);
      byName.set(key, list);
    }
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      const keeper = pickKeeper(group, officialSlugs);
      plans.push({
        keeperId: keeper.id,
        duplicateIds: group.filter((row) => row.id !== keeper.id).map((row) => row.id),
      });
    }
  }
  return plans;
}
