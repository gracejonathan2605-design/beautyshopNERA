import Link from "next/link";
import { NERA_IDENTITY } from "@/lib/nera-identity";

export const REGISTRE_IMAGE_SRC = "/legal/registre-commerce.jpg";
export const REGISTRE_IMAGE_WIDTH = 1041;
export const REGISTRE_IMAGE_HEIGHT = 1608;
export const REGISTRE_HREF = "/a-propos#immatriculation";

const REGISTRE_ALT = `Déclaration d’immatriculation de ${NERA_IDENTITY.legalName}, RCCM ${NERA_IDENTITY.rccm}.`;

export function RegistreCommerceCard({
  className = "",
  preview = false,
}: {
  className?: string;
  preview?: boolean;
}) {
  return (
    // Fichier déjà compressé : on évite une seconde compression qui rendrait le texte illisible.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={REGISTRE_IMAGE_SRC}
      alt={REGISTRE_ALT}
      width={REGISTRE_IMAGE_WIDTH}
      height={REGISTRE_IMAGE_HEIGHT}
      decoding="async"
      className={`w-full rounded-[1.4rem] border border-[#eee0e6] bg-white shadow-[0_18px_40px_-28px_rgba(58,36,48,0.55)] ${
        preview ? "h-72 object-cover object-top sm:h-80" : "h-auto"
      } ${className}`}
    />
  );
}

export function RegistreCommerceSection() {
  return (
    <section className="mt-10" id="immatriculation" aria-labelledby="immatriculation-titre">
      <h2 id="immatriculation-titre" className="font-serif text-3xl text-wine">
        Entreprise enregistrée
      </h2>
      <p className="mt-3 leading-relaxed text-black/65">
        {NERA_IDENTITY.name} est la boutique de {NERA_IDENTITY.legalName}, immatriculée au Registre du
        Commerce et du Crédit Mobilier. Le document ci-dessous est la déclaration d’immatriculation. Le RCCM
        est le même que sur les tickets de caisse.
      </p>
      <figure className="mt-6">
        <a href={REGISTRE_IMAGE_SRC} target="_blank" rel="noreferrer">
          <RegistreCommerceCard />
        </a>
        <figcaption className="mt-3 text-sm leading-relaxed text-black/50">
          RCCM {NERA_IDENTITY.rccm} · NUI {NERA_IDENTITY.nui}. Page 1 de la déclaration d’immatriculation.
        </figcaption>
        <a
          href={REGISTRE_IMAGE_SRC}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-wine underline decoration-wine/30 underline-offset-4"
        >
          Agrandir le document
        </a>
      </figure>
    </section>
  );
}

export function RegistreTrustLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href={REGISTRE_HREF}
      className={`inline-flex max-w-full items-center rounded-full border border-[#eee0e6] bg-white px-3 py-1.5 text-xs text-wine hover:border-gold ${className}`}
    >
      Entreprise enregistrée · RCCM {NERA_IDENTITY.rccm}
    </Link>
  );
}
