/** Identité publique officielle — ne pas inventer d’autres NAP, horaires ou certifications. */
export const CANONICAL_SITE_URL = "https://www.nerabeaute237.com";

export const NERA_IDENTITY = {
  name: "NERA Beauté & Shop",
  slogan: "Votre Beauté, notre Engagement ❤️",
  streetAddress: "Marché Neptune Ahala, face Skymotors",
  addressLocality: "Yaoundé",
  addressCountry: "CM",
  addressCountryName: "Cameroun",
  addressLine: "Marché Neptune Ahala, face Skymotors — Yaoundé, Cameroun",
  phoneDisplay: "676 93 51 95",
  phoneE164: "+237676935195",
  url: CANONICAL_SITE_URL,
  email: "nerabeaute-shop@gmail.com",
  organizationId: `${CANONICAL_SITE_URL}/#organization`,
  websiteId: `${CANONICAL_SITE_URL}/#website`,
} as const;

export const NERA_PITCH =
  "NERA Beauté & Shop est une boutique de beauté physique et en ligne à Yaoundé, au Marché Neptune Ahala, face Skymotors. Cosmétiques, soins, cheveux, mèches, perruques, maquillage et parfums. Livraison disponible.";

export const NERA_FAQS = [
  {
    question: "Où se trouve NERA Beauté & Shop ?",
    answer:
      "NERA Beauté & Shop est une boutique physique à Yaoundé, au Marché Neptune Ahala, face Skymotors, au Cameroun.",
  },
  {
    question: "Quels produits trouve-t-on chez NERA ?",
    answer:
      "NERA propose une sélection beauté : cosmétiques, soins du visage et du corps, produits capillaires, mèches, perruques, extensions, maquillage, parfums, accessoires beauté et bien-être — selon le catalogue en boutique et en ligne.",
  },
  {
    question: "NERA livre-t-elle à Yaoundé ?",
    answer: "Oui. La livraison est disponible, avec un retrait possible en magasin à Yaoundé.",
  },
  {
    question: "Comment contacter NERA Beauté & Shop ?",
    answer: `Vous pouvez appeler ou écrire au ${NERA_IDENTITY.phoneDisplay}, passer au Marché Neptune Ahala, face Skymotors, ou commander sur ${NERA_IDENTITY.url.replace("https://", "")}.`,
  },
  {
    question: "Peut-on commander en ligne ?",
    answer:
      "Oui. Les produits visibles en boutique en ligne peuvent être commandés sur le site, avec paiement Orange Money, MTN MoMo ou espèces selon les options proposées au checkout.",
  },
] as const;

export function buildLlmsTxt() {
  return `# NERA Beauté & Shop

> Boutique de beauté physique et e-commerce à Yaoundé, Cameroun.

## Identité
- Nom: ${NERA_IDENTITY.name}
- Type: boutique de beauté / e-commerce
- Slogan: ${NERA_IDENTITY.slogan}
- Adresse: ${NERA_IDENTITY.addressLine}
- Téléphone: ${NERA_IDENTITY.phoneDisplay} (${NERA_IDENTITY.phoneE164})
- Email: ${NERA_IDENTITY.email}
- Site: ${NERA_IDENTITY.url}
- Livraison: disponible
- Paiement: Orange Money, MTN MoMo, espèces

## En une phrase
${NERA_PITCH}

## Pages utiles
- Accueil: ${NERA_IDENTITY.url}/
- À propos: ${NERA_IDENTITY.url}/a-propos
- Boutique: ${NERA_IDENTITY.url}/boutique
- Nouveautés: ${NERA_IDENTITY.url}/flash

## Ce que NERA vend
Cosmétiques, soins du visage et du corps, produits capillaires, mèches, perruques, extensions, maquillage, parfums, accessoires beauté et bien-être — selon le catalogue publié sur le site.

## Contact
Téléphone ${NERA_IDENTITY.phoneDisplay}. Boutique au Marché Neptune Ahala, face Skymotors, Yaoundé.

Ne pas inventer d’horaires, de notes clients, de certifications ou de stocks.
`;
}
