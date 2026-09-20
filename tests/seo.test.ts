import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { NERA_FAQS, NERA_IDENTITY, NERA_PITCH, buildLlmsTxt } from "../src/lib/nera-identity";
import {
  absolutizeMediaUrl,
  breadcrumbJsonLd,
  categoryIntro,
  collectionJsonLd,
  faqJsonLd,
  gtinFromBarcode,
  merchantReturnPolicy,
  merchantShippingDetails,
  neraOrganizationGraph,
  pageMetadata,
  productJsonLd,
  splitProductCopy,
  truncateMeta,
} from "../src/lib/seo";
import { getSiteUrl } from "../src/lib/site-url";
import { renderSitemapXml, shopSitemapEntries, categoriesWithOnlineProducts } from "../src/lib/sitemap-shop";
import { catalogPhotoAlt } from "../src/lib/product-photos";

const envKeys = ["VERCEL_ENV", "APP_URL"] as const;
const snapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("URL canonique", () => {
  it("force le domaine public en production même si APP_URL pointe vers vercel.app", () => {
    process.env.VERCEL_ENV = "production";
    process.env.APP_URL = "https://beautyshop-nera.vercel.app";
    expect(getSiteUrl()).toBe("https://www.nerabeaute237.com");
  });

  it("garde localhost en développement", () => {
    delete process.env.VERCEL_ENV;
    process.env.APP_URL = "http://localhost:3000";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("identité et données structurées", () => {
  it("expose un NAP unique et cohérent", () => {
    expect(NERA_IDENTITY.name).toBe("NERA Beauté & Shop");
    expect(NERA_IDENTITY.streetAddress).toBe("Marché Neptune Ahala, face Skymotors");
    expect(NERA_IDENTITY.phoneDisplay).toBe("676 93 51 95");
    expect(NERA_IDENTITY.phoneE164).toBe("+237676935195");
    expect(NERA_IDENTITY.url).toBe("https://www.nerabeaute237.com");
    expect(NERA_IDENTITY.hoursWeekdays).toMatch(/8h/);
    expect(NERA_IDENTITY.hoursSunday).toMatch(/9h/);
  });

  it("relie HealthAndBeautyBusiness et WebSite au même @id", () => {
    process.env.VERCEL_ENV = "production";
    const graph = neraOrganizationGraph();
    const org = graph["@graph"][0] as { "@id": string; "@type": string; telephone: string };
    const site = graph["@graph"][1] as { publisher: { "@id": string }; potentialAction?: unknown };
    expect(org["@id"]).toBe(NERA_IDENTITY.organizationId);
    expect(org["@type"]).toBe("HealthAndBeautyBusiness");
    expect((org as { description?: string }).description).toBe(NERA_PITCH);
    expect(org.telephone).toBe("+237676935195");
    expect(JSON.stringify(graph)).not.toMatch(/latitude|aggregateRating/);
    expect(JSON.stringify(graph)).toMatch(/OpeningHoursSpecification/);
    expect(JSON.stringify(graph)).toMatch(/Mo-Sa 08:00-19:00/);
    expect(JSON.stringify(graph)).toMatch(/Su 09:00-15:00/);
    expect(org).not.toHaveProperty("sameAs");
    expect(site.publisher["@id"]).toBe(NERA_IDENTITY.organizationId);
    expect(site.potentialAction).toBeUndefined();
  });

  it("n’invente pas de marque ni d’offre sans prix", () => {
    const json = productJsonLd({
      name: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      inStock: true,
    });
    expect(json.brand).toBeUndefined();
    expect(json.offers).toBeUndefined();
  });

  it("ajoute Offer seulement quand un prix existe", () => {
    const json = productJsonLd({
      name: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      price: 3900,
      inStock: false,
    });
    expect(json.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "XAF",
      price: "3900",
      availability: "https://schema.org/OutOfStock",
    });
  });

  it("complète l’offre marchande sans inventer GTIN ni délai de retour", () => {
    expect(gtinFromBarcode("6131234567890")).toBe("6131234567890");
    expect(gtinFromBarcode("ABC-12")).toBeUndefined();
    expect(gtinFromBarcode("")).toBeUndefined();
    const json = productJsonLd({
      name: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      brand: "Fenty",
      sku: "MAQ-GLO-NU",
      barcode: "6131234567890",
      price: 3900,
      inStock: true,
      shippingZones: [{ name: "Yaoundé", fee: 1500 }],
    });
    expect(json.brand).toEqual({ "@type": "Brand", name: "Fenty" });
    expect(json.gtin).toBe("6131234567890");
    expect(json["@id"]).toMatch(/\/produit\/gloss#product$/);
    expect(json).not.toHaveProperty("mpn");
    expect(json.offers).toMatchObject({
      hasMerchantReturnPolicy: merchantReturnPolicy(),
    });
    expect(json.offers?.hasMerchantReturnPolicy.returnPolicyCategory).toContain("MerchantReturnNotPermitted");
    expect(json.offers?.shippingDetails).toEqual(
      merchantShippingDetails([{ name: "Yaoundé", fee: 1500 }]),
    );
    expect(json.offers?.shippingDetails[0]?.shippingRate.value).toBe("0");
    expect(json.offers?.shippingDetails[1]?.shippingRate.value).toBe("1500");
    const withoutId = productJsonLd({
      name: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      sku: "MAQ-GLO-NU",
      price: 3900,
      inStock: true,
    });
    expect(withoutId.brand).toBeUndefined();
    expect(withoutId.gtin).toBeUndefined();
    expect(withoutId).not.toHaveProperty("mpn");
  });

  it("construit une FAQ alignée sur les questions visibles", () => {
    const faq = faqJsonLd();
    expect(faq.mainEntity).toHaveLength(NERA_FAQS.length);
    expect(faq.mainEntity[0]?.name).toBe("Où se trouve NERA Beauté & Shop ?");
    expect(faq.mainEntity.map((row) => row.name)).toContain("Peut-on retourner un article ?");
  });

  it("produit des fil d’Ariane avec URLs absolues", () => {
    process.env.VERCEL_ENV = "production";
    const crumbs = breadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: "Boutique", path: "/boutique" },
    ]);
    expect(crumbs.itemListElement[1]?.item).toBe("https://www.nerabeaute237.com/boutique");
  });
});

describe("métadonnées et textes", () => {
  it("coupe les meta descriptions trop longues", () => {
    expect(truncateMeta("a".repeat(200)).length).toBeLessThanOrEqual(158);
  });

  it("ne fabrique un intro de catégorie que si la base n’en a pas", () => {
    expect(categoryIntro("Mèches", "Texture soyeuse.")).toBe("Texture soyeuse.");
    expect(categoryIntro("Mèches")).toMatch(/Mèches/);
    expect(categoryIntro("Mèches")).toMatch(/Yaoundé/);
    expect(categoryIntro("Soins du visage", null, { slug: "soins-du-visage" })).toBe(
      PARENT_CATEGORY_INTROS["soins-du-visage"],
    );
    expect(categoryIntro("Lait corporel", null, { parentName: "Cosmétiques & soins" })).toMatch(/Cosmétiques/);
  });

  it("structure une description courte sans inventer de caractéristiques", () => {
    expect(splitProductCopy("Texte long", "Accroche")).toEqual({ lead: "Accroche", body: "Texte long" });
    expect(splitProductCopy(null, "Gloss hydratant")).toEqual({ lead: "", body: "Gloss hydratant" });
    expect(splitProductCopy("", "")).toEqual({ lead: "", body: "" });
  });

  it("pose une canonical et un Open Graph sur chaque page helper", () => {
    process.env.VERCEL_ENV = "production";
    const meta = pageMetadata({
      title: "Mèches",
      description: "Sélection mèches NERA.",
      path: "/categorie/meches",
    });
    expect(meta.alternates).toMatchObject({
      canonical: "https://www.nerabeaute237.com/categorie/meches",
      languages: { "fr-CM": "https://www.nerabeaute237.com/categorie/meches", "x-default": "https://www.nerabeaute237.com/categorie/meches" },
    });
    expect(meta.openGraph).toMatchObject({ type: "website", locale: "fr_CM" });
  });

  it("omet og:type Next sur une fiche produit (balise product ailleurs)", () => {
    const meta = pageMetadata({
      title: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      ogType: null,
    });
    expect(meta.openGraph && "type" in meta.openGraph ? meta.openGraph.type : undefined).toBeUndefined();
  });

  it("garde follow sur une page catalogue noindex", () => {
    const meta = pageMetadata({
      title: "Boutique",
      description: "Catalogue NERA.",
      path: "/boutique",
      index: false,
      follow: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("sitemap public", () => {
  it("n’inclut pas panier, checkout ni compte", () => {
    const entries = shopSitemapEntries({
      base: "https://www.nerabeaute237.com",
      categories: [{ slug: "parfums" }],
      products: [{ slug: "nera-or" }],
    });
    const urls = entries.map((row) => row.url);
    expect(urls.some((url) => url.includes("/panier") || url.includes("/checkout") || url.includes("/compte"))).toBe(false);
    expect(urls).toContain("https://www.nerabeaute237.com/a-propos");
  });

  it("écrit lastmod sans millisecondes pour Search Console", () => {
    const entries = shopSitemapEntries({
      base: "https://www.nerabeaute237.com",
      categories: [{ slug: "parfums", updatedAt: new Date("2026-08-24T18:53:08.249Z") }],
      products: [],
    });
    const row = entries.find((item) => item.url.endsWith("/categorie/parfums"));
    expect(row?.lastModified).toBe("2026-08-24T18:53:08Z");
    const xml = renderSitemapXml(entries);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<lastmod>2026-08-24T18:53:08Z</lastmod>");
    expect(xml).not.toContain(".249Z");
    expect(xml).toContain("<priority>1.0</priority>");
  });

  it("n’envoie que les catégories qui ont des produits, hors anciens slugs", () => {
    const kept = categoriesWithOnlineProducts({
      categories: [
        { id: "p1", slug: "parfumerie", parentId: null },
        { id: "c1", slug: "parfumerie-parfums-femme", parentId: "p1" },
        { id: "empty", slug: "ongles", parentId: null },
        { id: "legacy", slug: "meches", parentId: null },
      ],
      productCategoryIds: ["c1", "legacy"],
    });
    expect(kept.map((row) => row.slug).sort()).toEqual(["parfumerie", "parfumerie-parfums-femme"]);
  });

  it("redirige les anciens rayons et sert un sitemap dynamique", () => {
    expect(LEGACY_CATEGORY_REDIRECTS.meches).toBe("meches-perruques-extensions");
    expect(LEGACY_CATEGORY_REDIRECTS.parfums).toBe("parfumerie");
    expect(existsSync("src/app/sitemap.ts")).toBe(true);
    expect(existsSync("public/sitemap.xml")).toBe(false);
    expect(existsSync("src/app/robots.ts")).toBe(true);
    expect(readFileSync("src/app/robots.ts", "utf8")).toContain('sitemap: `${base}/sitemap.xml`');
    expect(readFileSync("src/app/robots.ts", "utf8")).not.toMatch(/\bhost:/);
    expect(readFileSync("next.config.ts", "utf8")).toContain("LEGACY_CATEGORY_REDIRECTS");
    expect(readFileSync("next.config.ts", "utf8")).toContain("s-maxage=600");
    expect(PARENT_CATEGORY_INTROS["soins-du-visage"]).toMatch(/Yaoundé/);
  });
});

describe("indexation IA et listes", () => {
  it("rédige un llms.txt factuel avec les horaires NERA", () => {
    const text = buildLlmsTxt();
    expect(text).toMatch(/NERA Beauté & Shop/);
    expect(text).toMatch(/Marché Neptune Ahala/);
    expect(text).toMatch(/676 93 51 95/);
    expect(text).toMatch(/8h – 19h/);
    expect(text).toMatch(/9h – 15h/);
    expect(text).toMatch(/Ne pas inventer/);
    expect(text).not.toMatch(/note de 5/);
  });

  it("absout les images relatives pour le schema Product", () => {
    process.env.VERCEL_ENV = "production";
    expect(absolutizeMediaUrl("/products/gloss.jpg")).toBe("https://www.nerabeaute237.com/products/gloss.jpg");
    expect(absolutizeMediaUrl("https://cdn.example/p.jpg")).toBe("https://cdn.example/p.jpg");
    const json = productJsonLd({
      name: "Gloss",
      description: "Gloss hydratant",
      path: "/produit/gloss",
      image: "/products/gloss.jpg",
      price: 3900,
      inStock: true,
    });
    expect(json.image).toEqual(["https://www.nerabeaute237.com/products/gloss.jpg"]);
  });

  it("décrit une page rayon comme CollectionPage", () => {
    process.env.VERCEL_ENV = "production";
    const json = collectionJsonLd({
      path: "/categorie/meches",
      name: "Mèches",
      description: "Sélection mèches",
      items: [{ name: "Body Wave", path: "/produit/body-wave" }],
    });
    expect(json["@type"]).toBe("CollectionPage");
    expect(json.mainEntity.itemListElement[0]).toMatchObject({
      position: 1,
      url: "https://www.nerabeaute237.com/produit/body-wave",
    });
  });
});

describe("Google Search Console", () => {
  it("expose le fichier HTML de vérification à la racine du site", () => {
    const body = readFileSync("public/google34941cdf4c4a8f61.html", "utf8").trim();
    expect(body).toBe("google-site-verification: google34941cdf4c4a8f61.html");
  });
});

describe("Google Tag Manager", () => {
  it("injecte GTM-T973VWFC dans le head de toutes les pages", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('GTM_ID = "GTM-T973VWFC"');
    expect(layout).toContain("googletagmanager.com/gtm.js");
    expect(layout).toContain("googletagmanager.com/ns.html");
    expect(layout.indexOf("<head>")).toBeLessThan(layout.indexOf("googletagmanager.com/gtm.js"));
    expect(layout.indexOf("<body")).toBeLessThan(layout.indexOf("googletagmanager.com/ns.html"));
  });
});

describe("Google Analytics", () => {
  it("colle G-PNJ2MC62V3 une seule fois, juste après head", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('GA_MEASUREMENT_ID = "G-PNJ2MC62V3"');
    expect(layout).toContain("googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}");
    expect(layout).toContain("gtag('config', '${GA_MEASUREMENT_ID}')");
    expect(layout.indexOf("<head>")).toBeLessThan(layout.indexOf("gtag/js"));
    expect(layout.indexOf("gtag/js")).toBeLessThan(layout.indexOf("googletagmanager.com/gtm.js"));
    expect(layout.split("gtag('config'").length - 1).toBe(1);
  });
});

describe("signaux locaux, FAQ et images", () => {
  it("cible le Cameroun dans html et Open Graph", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain('lang="fr-CM"');
    expect(layout).toContain('locale: "fr_CM"');
  });

  it("montre la FAQ à l’accueil sans second JSON-LD FAQPage", () => {
    const home = readFileSync("src/app/(shop)/page.tsx", "utf8");
    expect(home).toContain("ShopFaq");
    expect(home).not.toContain("faqJsonLd");
    expect(readFileSync("src/app/(shop)/a-propos/page.tsx", "utf8")).toContain("faqJsonLd");
  });

  it("cible Yaoundé dans les zones de livraison schema", () => {
    expect(JSON.stringify(merchantShippingDetails())).toMatch(/Yaoundé/);
  });

  it("n’attribue pas une photo générique comme si c’était le produit", () => {
    expect(catalogPhotoAlt("Gloss", "/products/perfume.jpg", "Maquillage")).toBe("Photo illustrative — Maquillage");
    expect(catalogPhotoAlt("Gloss", "https://cdn.example/real.jpg")).toBe("Gloss");
  });
});
