import { flashShopBadges } from "@/lib/flash";

export function ProductBadges({
  flash,
  promoPercent,
  isPromo,
  isNew,
}: {
  flash: boolean;
  promoPercent: number;
  isPromo?: boolean;
  isNew?: boolean;
}) {
  const badges = flashShopBadges({ flash, promoPercent, isPromo, isNew });
  if (!badges.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {badges.map((badge) => (
        <span
          key={badge.kind}
          className={
            badge.kind === "flash"
              ? "rounded-full bg-wine/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cream"
              : badge.kind === "promo"
                ? "rounded-full bg-white/92 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-brown"
                : "rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-wine"
          }
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
