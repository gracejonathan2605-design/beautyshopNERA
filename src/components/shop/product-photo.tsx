import Image from "next/image";

export function ProductPhotoPlaceholder({ name }: { name: string }) {
  return (
    <div
      className="flex h-full w-full items-end bg-linear-to-br from-blush via-champagne to-[#f4e6d8] p-4"
      aria-hidden
    >
      <p className="font-serif text-2xl leading-tight text-wine/70">{name}</p>
    </div>
  );
}

export function ProductPhoto({
  src,
  alt,
  sizes,
  quality,
  priority,
  className,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  quality: number;
  priority?: boolean;
  className?: string;
}) {
  if (!src) return <ProductPhotoPlaceholder name={alt} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      quality={quality}
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );
}
