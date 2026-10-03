import Link from "next/link";

export function ShopBreadcrumbs({
  items,
  tone = "ink",
}: {
  items: { name: string; href?: string }[];
  tone?: "ink" | "cream";
}) {
  const muted = tone === "cream" ? "text-cream/60" : "text-black/50";
  const current = tone === "cream" ? "text-cream" : "text-wine";
  const link = tone === "cream" ? "hover:text-cream hover:underline" : "hover:text-wine hover:underline";
  return (
    <nav aria-label="Fil d’Ariane" className={`text-sm ${muted}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {last || !item.href ? (
                <span className={last ? current : undefined}>{item.name}</span>
              ) : (
                <Link href={item.href} className={link}>
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
