import Image from "next/image";
import { SHOP_IMAGE_QUALITY } from "@/lib/image-limits";

export function ProductHeroImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-linear-to-br from-blush to-champagne">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        quality={SHOP_IMAGE_QUALITY}
        priority
      />
    </div>
  );
}
