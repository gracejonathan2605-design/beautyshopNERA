import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { getSiteUrl } from "@/lib/site-url";

export const GTM_ID = "GTM-T973VWFC";
export const GA_MEASUREMENT_ID = "G-PNJ2MC62V3";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3a2430",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
    template: "%s | NERA Beauté & Shop",
  },
  description:
    "NERA Beauté & Shop est une boutique de beauté à Yaoundé, au Marché Neptune Ahala, face Skymotors. Cosmétiques, soins, cheveux, mèches, perruques, maquillage et parfums — en magasin et en ligne.",
  manifest: "/manifest.webmanifest",
  applicationName: NERA_IDENTITY.name,
  openGraph: {
    locale: "fr_CM",
    siteName: NERA_IDENTITY.name,
    title: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
    description:
      "Boutique de beauté physique et en ligne à Yaoundé. Marché Neptune Ahala, face Skymotors. Livraison disponible.",
    url: "/",
    images: [{ url: "/brand/nera-hero-products.jpg", alt: "Sélection beauté NERA Beauté & Shop à Yaoundé" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NERA Beauté & Shop | Boutique beauté à Yaoundé",
    description: "Boutique de beauté à Yaoundé — magasin et e-commerce. Livraison disponible.",
    images: ["/brand/nera-hero-products.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "NERA",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/nera-logo.jpg" },
    ],
    apple: "/icons/icon-192.png",
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  let mediaOrigin = "";
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      mediaOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    }
  } catch {
    mediaOrigin = "";
  }
  return (
    <html lang="fr-CM" className={`${outfit.variable} ${cormorant.variable} h-full`}>
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {mediaOrigin ? (
          <>
            <link rel="preconnect" href={mediaOrigin} />
            <link rel="dns-prefetch" href={mediaOrigin} />
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
