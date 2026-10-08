import {
  NJANGI_BANNER_COPIES,
  NJANGI_BANNER_HEIGHT,
  NJANGI_BANNER_SRC,
  NJANGI_BANNER_WIDTH,
  NJANGI_LINK_LABEL,
  njangiWhatsAppUrl,
} from "@/lib/njangi-skincare";

/** Bandeau publicitaire défilant, en tête des pages boutique. */
export function NjangiSkincareBanner() {
  const href = njangiWhatsAppUrl();
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="njangi-banner no-print"
      aria-label={NJANGI_LINK_LABEL}
    >
      <span className="njangi-viewport">
        <span className="njangi-track">
          {Array.from({ length: NJANGI_BANNER_COPIES }, (_, index) => (
            // Le défilement a besoin de la largeur naturelle de l’image, répétée.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={NJANGI_BANNER_SRC}
              alt=""
              width={NJANGI_BANNER_WIDTH}
              height={NJANGI_BANNER_HEIGHT}
              draggable={false}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              className="njangi-slide"
            />
          ))}
        </span>
      </span>
      <span className="njangi-cta">Rejoindre sur WhatsApp</span>
    </a>
  );
}
