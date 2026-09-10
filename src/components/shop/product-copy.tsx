import Link from "next/link";
import { formatCfa } from "@/lib/money";
import { splitProductCopy } from "@/lib/seo";

export function ProductCopy({
  description,
  shortDescription,
}: {
  description?: string | null;
  shortDescription?: string | null;
}) {
  const { lead, body } = splitProductCopy(description, shortDescription);
  if (!lead && !body) return null;
  return (
    <div className="mt-4 space-y-3 text-black/70">
      {lead ? <p className="text-lg leading-relaxed">{lead}</p> : null}
      {body ? <p className="whitespace-pre-line leading-relaxed">{body}</p> : null}
    </div>
  );
}

export function ProductFacts({
  category,
  brand,
  price,
  inStock,
  variants,
}: {
  category?: { name: string; slug: string } | null;
  brand?: string | null;
  price: number;
  inStock: boolean;
  variants: { name: string }[];
}) {
  const extraVariants = variants.filter((row) => row.name && row.name.toLowerCase() !== "défaut");
  return (
    <dl className="mt-6 grid gap-2 text-sm text-black/60">
      {category ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-black/40">Rayon</dt>
          <dd>
            <Link href={`/categorie/${category.slug}`} className="text-brown underline">
              {category.name}
            </Link>
          </dd>
        </div>
      ) : null}
      {brand ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-black/40">Marque</dt>
          <dd>{brand}</dd>
        </div>
      ) : null}
      {price > 0 ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-black/40">Prix</dt>
          <dd>{formatCfa(price)}</dd>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-black/40">Disponibilité</dt>
        <dd>{inStock ? "En stock" : "Indisponible pour le moment"}</dd>
      </div>
      {extraVariants.length > 1 ? (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-black/40">Variantes</dt>
          <dd>{extraVariants.map((row) => row.name).join(", ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}
