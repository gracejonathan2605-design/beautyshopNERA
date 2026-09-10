import { afterEach, describe, expect, it } from "vitest";
import { NERA_FAQS, NERA_IDENTITY, NERA_PITCH, buildLlmsTxt } from "../src/lib/nera-identity";
import {
  absolutizeMediaUrl,
  breadcrumbJsonLd,
  categoryIntro,
  collectionJsonLd,
  faqJsonLd,
  neraOrganizationGraph,
  pageMetadata,
  productJsonLd,
  splitProductCopy,
  truncateMeta,
} from "../src/lib/seo";
import { getSiteUrl } from "../src/lib/site-url";
import { shopSitemapEntries } from "../src/lib/sitemap-shop";

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
  });

  it("relie Organization, Store et WebSite au même @id", () => {
    process.env.VERCEL_ENV = "production";
    const graph = neraOrganizationGraph();
    const org = graph["@graph"][0] as { "@id": string; "@type": string[]; telephone: string };
    const site = graph["@graph"][1] as { publisher: { "@id": string } };
    expect(org["@id"]).toBe(NERA_IDENTITY.organizationId);
    expect(org["@type"]).toEqual(
      expect.arrayContaining(["Organization", "Store", "LocalBusiness", "HealthAndBeautyBusiness"]),
    );
    expect((org as { description?: string }).description).toBe(NERA_PITCH);
    expect(org.telephone).toBe("+237676935195");
    expect(JSON.stringify(graph)).not.toMatch(/latitude|openingHours|aggregateRating/);
    expect(org).not.toHaveProperty("sameAs");
    expect(site.publisher["@id"]).toBe(NERA_IDENTITY.organizationId);
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

  it("construit une FAQ alignée sur les questions visibles", () => {
    const faq = faqJsonLd();
    expect(faq.mainEntity).toHaveLength(NERA_FAQS.length);
    expect(faq.mainEntity[0]?.name).toBe("Où se trouve NERA Beauté & Shop ?");
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
      languages: { "fr-CM": "https://www.nerabeaute237.com/categorie/meches" },
    });
    expect(meta.openGraph).toMatchObject({ type: "website", locale: "fr_FR" });
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
});

describe("indexation IA et listes", () => {
  it("rédige un llms.txt factuel sans horaires inventés", () => {
    const text = buildLlmsTxt();
    expect(text).toMatch(/NERA Beauté & Shop/);
    expect(text).toMatch(/Marché Neptune Ahala/);
    expect(text).toMatch(/676 93 51 95/);
    expect(text).toMatch(/Ne pas inventer/);
    expect(text).not.toMatch(/09h|ouvert du lundi|note de 5/);
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
