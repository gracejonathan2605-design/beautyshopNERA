import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductBuy } from "@/components/shop/product-buy";
import { ProductCard } from "@/components/shop/product-card";
import { shopProductImage } from "@/lib/product-photos";
import { getCachedProductPage, getCatalogDuplicateIdentity, getHomeCatalog, getRelatedProducts, getActiveDeliveryZones } from "@/lib/catalog-cache";
import { uniquePublicTitle } from "@/lib/catalog-hygiene";
import { whatsappChatUrl } from "@/lib/receipt";
import { formatCfa } from "@/lib/money";
import { unitPrice, promoPercent } from "@/lib/pricing";
import { SHOP_TRUST_LINE, YAOUNDE_PLACES } from "@/lib/shop-faces";
import { ProductFlashMeta } from "@/components/shop/product-flash-meta";
import { ShopBreadcrumbs } from "@/components/shop/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductOpenGraphTags } from "@/components/seo/product-open-graph";
import { isFlashActive } from "@/lib/flash";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { breadcrumbJsonLd, pageMetadata, productJsonLd, productPageTitle, productPlainText, truncateMeta } from "@/lib/seo";
import { productInStock } from "@/lib/stock-display";
import { ProductCopy, ProductFacts } from "@/components/shop/product-copy";
import { ProductHeroImage } from "@/components/shop/product-hero-image";
import { ProductPhotoPlaceholder } from "@/components/shop/product-photo";
import { requestRestock } from "@/app/actions/shop";
import { PRODUCT_GRID_HOME_CLASS } from "@/lib/image-limits";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ ok?: string; erreur?: string }> };

async function loadSellableProduct(slug: string) {
  const [product, identity] = await Promise.all([
    getCachedProductPage(slug),
    getCatalogDuplicateIdentity().catch(
      (): { redirects: Record<string, string>; collidingIds: string[] } => ({
        redirects: {},
        collidingIds: [],
      }),
    ),
  ]);
  if (!product || product.deletedAt || !product.onlineVisible || product.status !== "ACTIVE") {
    const dest = identity.redirects[slug];
    if (dest && dest !== slug) permanentRedirect(`/produit/${dest}`);
    return null;
  }
  const heading = identity.collidingIds.includes(product.id)
    ? uniquePublicTitle(product.name, {
        sku: product.sku || product.variants[0]?.sku,
        slug: product.slug,
        variantName: product.variants[0]?.name,
      })
    : product.name;
  return { product, heading };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadSellableProduct(slug);
  if (!loaded) {
    return pageMetadata({ title: "Produit", description: "Produit NERA Beauté & Shop.", path: `/produit/${slug}`, index: false });
  }
  const { product, heading } = loaded;
  const text = productPlainText(product.description, product.shortDescription);
  const image = shopProductImage(product.slug, product.images.find((m) => m.kind === "IMAGE")?.url, product.name);
  const desc =
    text ||
    `${heading}${product.category?.name ? ` — ${product.category.name}` : ""} chez NERA Beauté & Shop à Yaoundé.`;
  return pageMetadata({
    title: productPageTitle(heading, product.category?.name),
    description: truncateMeta(desc),
    path: `/produit/${product.slug}`,
    image,
    ogType: null,
  });
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const loaded = await loadSellableProduct(slug);
  if (!loaded) notFound();
  const { product, heading } = loaded;
  const variants = product.variants;
  if (!variants.length) notFound();

  const uploaded = product.images.map((m) => ({ id: m.id, url: m.url, alt: m.alt, kind: m.kind }));
  const seedPhoto = shopProductImage(product.slug, null, product.name);
  const gallery = uploaded.length
    ? uploaded
    : seedPhoto
      ? [{ id: "catalog", url: seedPhoto, alt: heading, kind: "IMAGE" as const }]
      : [];

  const price = unitPrice(variants[0]);
  const flash = isFlashActive(product);
  const percent = promoPercent(variants[0].salePrice, variants[0].promoPrice);
  const wa = whatsappChatUrl(
    NERA_IDENTITY.phoneE164,
    `Bonjour NERA Beauté, je veux un conseil sur ${heading} (${formatCfa(price)}).`,
  );
  const popular = await getHomeCatalog()
    .then((home) => home.popularIds.includes(product.id))
    .catch(() => false);
  const inStock = productInStock(variants);
  const related = await getRelatedProducts(product.id, product.category?.id ?? null);
  const shippingZones = await getActiveDeliveryZones().catch(() => []);
  const description = productPlainText(product.description, product.shortDescription);
  const image = gallery.find((m) => m.kind === "IMAGE")?.url;
  const photos = gallery.filter((m) => m.kind === "IMAGE");
  const hasVideo = gallery.some((m) => m.kind === "VIDEO");
  const barcode = variants.map((row) => row.barcode).find((value) => value?.trim());
  const crumbs = [
    { name: "Accueil", path: "/" },
    ...(product.category ? [{ name: product.category.name, path: `/categorie/${product.category.slug}` }] : [{ name: "Boutique", path: "/boutique" }]),
    { name: heading, path: `/produit/${product.slug}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-36 md:py-8 md:pb-12">
      <ProductOpenGraphTags price={price} inStock={inStock} brand={product.brand?.name} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd
        data={productJsonLd({
          name: heading,
          description: description || heading,
          path: `/produit/${product.slug}`,
          image,
          brand: product.brand?.name,
          category: product.category?.name,
          sku: product.sku || variants[0]?.sku,
          barcode,
          price,
          inStock,
          shippingZones,
        })}
      />
      <ShopBreadcrumbs
        items={[
          { name: "Accueil", href: "/" },
          product.category
            ? { name: product.category.name, href: `/categorie/${product.category.slug}` }
            : { name: "Boutique", href: "/boutique" },
          { name: heading },
        ]}
      />
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {photos.length === 0 && !hasVideo ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
            <ProductPhotoPlaceholder name={heading} />
          </div>
        ) : photos.length <= 1 && !hasVideo && photos[0] ? (
          <ProductHeroImage src={photos[0].url} alt={photos[0].alt ?? heading} />
        ) : (
          <ProductGallery name={heading} media={gallery} />
        )}
        <div>
          {product.category ? (
            <p className="text-sm text-wine/70">
              <Link href={`/categorie/${product.category.slug}`} className="underline decoration-wine/30 underline-offset-4">
                {product.category.name}
              </Link>
            </p>
          ) : null}
          <ProductFlashMeta
            flash={flash}
            flashEndAt={product.flashEndAt}
            promoPercent={percent}
            isPromo={product.isPromo}
            isNew={product.isNew}
          />
          <h1 className="mt-2 font-serif text-5xl text-wine">{heading}</h1>
          {product.brand?.name ? (
            product.brand.isPartner && product.brand.showOnSite ? (
              <p className="mt-2 text-sm text-wine/70">
                <Link href={`/marques/${product.brand.slug}`} className="underline decoration-wine/30 underline-offset-4">
                  {product.brand.name}
                </Link>
              </p>
            ) : (
              <p className="mt-2 text-sm text-wine/70">{product.brand.name}</p>
            )
          ) : null}
          <ProductBuy
            oftenChosen={popular}
            variants={variants.map((v) => ({
              id: v.id,
              name: v.name,
              salePrice: v.salePrice,
              promoPrice: v.promoPrice,
              inventories: v.inventories,
            }))}
            whatsappUrl={wa}
          />
          <p className="mt-4 text-sm text-wine/70">{SHOP_TRUST_LINE}</p>
          <ul className="mt-4 space-y-2 text-sm text-black/60">
            {YAOUNDE_PLACES.map((place) => (
              <li key={place.place}>
                <span className="text-wine">{place.place}.</span> {place.line}
              </li>
            ))}
          </ul>
          {!inStock ? (
            <form action={requestRestock} className="mt-4 space-y-2 rounded-2xl border border-[#eee0e6] p-4">
              <p className="text-sm text-black/60">Prévenez-moi sur WhatsApp dès le retour en stock.</p>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="slug" value={product.slug} />
              <input name="phone" required placeholder="Téléphone" className="w-full rounded-xl border px-3 py-2" />
              <button className="rounded-full bg-brown px-4 py-2 text-sm text-cream">Me prévenir</button>
              {query.ok === "relance" ? <p className="text-sm text-emerald-800">C’est noté. Nous écrirons sur ce numéro.</p> : null}
            </form>
          ) : null}
        </div>
      </div>
      <section className="mt-12 max-w-3xl">
        <ProductCopy description={product.description} shortDescription={product.shortDescription} />
        <h2 className="mt-8 font-serif text-2xl text-wine">Détails</h2>
        <ProductFacts
          category={product.category}
          brand={product.brand?.name}
          price={price}
          inStock={inStock}
          variants={variants.map((v) => ({ name: v.name }))}
        />
      </section>
      {related.length ? (
        <section className="mt-16">
          <h2 className="font-serif text-3xl text-wine">Dans le même rayon</h2>
          <div className={`mt-6 ${PRODUCT_GRID_HOME_CLASS}`}>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}