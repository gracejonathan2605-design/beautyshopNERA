import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductBuy } from "@/components/shop/product-buy";
import { catalogPhotoFor } from "@/lib/product-photos";
import { getCachedProductPage } from "@/lib/catalog-cache";
import { getShopSettings } from "@/lib/settings";
import { whatsappChatUrl } from "@/lib/receipt";
import { formatCfa } from "@/lib/money";
import { unitPrice, promoPercent } from "@/lib/pricing";
import { PayDeliveryBadges } from "@/components/shop/trust-badges";
import { ProductFlashMeta } from "@/components/shop/product-flash-meta";
import { isFlashActive } from "@/lib/flash";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getCachedProductPage(slug), getShopSettings()]);
  if (!product || product.deletedAt || !product.onlineVisible || product.status !== "ACTIVE") notFound();
  const variants = product.variants;
  if (!variants.length) notFound();

  const gallery = product.images.length
    ? product.images.map((m) => ({ id: m.id, url: m.url, alt: m.alt, kind: m.kind }))
    : [{ id: "catalog", url: catalogPhotoFor(product.slug, product.name), alt: product.name, kind: "IMAGE" as const }];

  const price = unitPrice(variants[0]);
  const flash = isFlashActive(product);
  const percent = promoPercent(variants[0].salePrice, variants[0].promoPrice);
  const wa = settings.phone
    ? whatsappChatUrl(
        settings.phone,
        `Bonjour NERA Beauté, je souhaite commander ${product.name} (${formatCfa(price)}).`,
      )
    : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <ProductGallery name={product.name} media={gallery} />
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold">{product.category?.name}</p>
        <ProductFlashMeta
          flash={flash}
          flashEndAt={product.flashEndAt}
          promoPercent={percent}
          isPromo={product.isPromo}
          isNew={product.isNew}
        />
        <h1 className="mt-2 font-serif text-5xl text-wine">{product.name}</h1>
        <p className="mt-4 text-black/70">{product.description ?? product.shortDescription}</p>
        <div className="mt-5">
          <PayDeliveryBadges />
        </div>
        <ProductBuy
          variants={variants.map((v) => ({
            id: v.id,
            name: v.name,
            salePrice: v.salePrice,
            promoPrice: v.promoPrice,
            inventories: v.inventories,
          }))}
          whatsappUrl={wa}
        />
      </div>
    </div>
  );
}
