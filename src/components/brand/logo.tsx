import Image from "next/image";

export const BRAND_LOGO_SRC = "/brand/nera-logo.jpg";
export const BRAND_RECEIPT_SRC = "/brand/nera-receipt.png";
export const BRAND_NAME = "NERA Beauté & Shop";

type Size = "sm" | "md" | "lg" | "hero";

const PX: Record<Size, number> = {
  sm: 44,
  md: 64,
  lg: 112,
  hero: 196,
};

export function BrandLogo({
  size = "md",
  className = "",
  priority = false,
  alt = BRAND_NAME,
}: {
  size?: Size;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const px = PX[size];
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={alt}
      width={px}
      height={px}
      priority={priority}
      className={`rounded-full object-cover shadow-[0_8px_24px_-12px_rgba(58,36,48,0.45)] ${className}`}
    />
  );
}

export function BrandLockup({
  size = "md",
  subtitle,
  className = "",
  priority = false,
}: {
  size?: Size;
  subtitle?: string;
  className?: string;
  priority?: boolean;
}) {
  const titleClass =
    size === "sm"
      ? "font-serif text-xl leading-none tracking-[0.14em] text-wine"
      : "font-serif text-[1.7rem] leading-none tracking-[0.16em] text-wine";
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandLogo size={size} priority={priority} />
      <span className="min-w-0">
        <span className={`block ${titleClass}`}>NERA</span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-gold">
          {subtitle ?? "Beauté & Shop"}
        </span>
      </span>
    </span>
  );
}

export function ReceiptLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- print CSS needs a plain img
    <img
      src={BRAND_RECEIPT_SRC}
      alt={BRAND_NAME}
      width={112}
      height={112}
      className="receipt-logo"
    />
  );
}
