import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NERA_IDENTITY } from "../src/lib/nera-identity";
import { cgvSections, privacySections, returnSections } from "../src/lib/shop-legal";

function text(sections: { paragraphs: string[] }[]) {
  return sections.flatMap((section) => section.paragraphs).join("\n");
}

describe("conditions de vente à l’avantage de la boutique", () => {
  const cgv = text(cgvSections(24));

  it("identifie le vendeur et le droit camerounais", () => {
    expect(cgv).toContain(NERA_IDENTITY.legalName);
    expect(cgv).toContain(NERA_IDENTITY.rccm);
    expect(cgv).toContain("République du Cameroun");
    expect(cgv).toContain("Yaoundé");
  });

  it("ne conclut la vente qu’après paiement et limite la responsabilité au prix", () => {
    expect(cgv).toContain("24 heures");
    expect(cgv).toMatch(/contrat n’est formé que lorsque la boutique confirme/);
    expect(cgv).toContain("Orange Money");
    expect(cgv).toContain("prix effectivement payé");
    expect(cgv).toContain("force majeure");
  });
});

describe("retours fermes pour l’hygiène et les cheveux ouverts", () => {
  const returns = text(returnSections("Les articles d'hygiène et les mèches ouvertes ne sont ni repris ni échangés."));

  it("refuse la reprise des produits ouverts et impose 48 heures", () => {
    expect(returns).toContain("vente est ferme");
    expect(returns).toContain("48 heures");
    expect(returns).toMatch(/mèches, perruques ou extensions/);
    expect(returns).toContain("avoir");
    expect(returns).not.toMatch(/remboursement intégral automatique/);
  });

  it("ajoute une règle propre à la boutique si elle ne répète pas l’hygiène", () => {
    const custom = text(returnSections("Les articles personnalisés restent acquis."));
    expect(custom).toContain("Les articles personnalisés restent acquis.");
  });
});

describe("confidentialité selon la loi camerounaise", () => {
  const privacy = text(privacySections());

  it("informe selon la loi n° 2024/017 sans prétendre vendre les données", () => {
    expect(privacy).toContain("2024/017");
    expect(privacy).toContain(NERA_IDENTITY.email);
    expect(privacy).toContain("ne sont ni vendues");
    expect(privacy).toContain("code secret");
    expect(privacy).toContain("dix ans");
    expect(privacy).toMatch(/droit d’accès/);
  });

  it("affiche les trois pages avec un sommaire", () => {
    for (const file of ["src/app/(shop)/cgv/page.tsx", "src/app/(shop)/retours/page.tsx", "src/app/(shop)/confidentialite/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("LegalDocument");
    }
    expect(readFileSync("src/components/shop/checkout-form.tsx", "utf8")).toContain('href="/cgv"');
  });
});
