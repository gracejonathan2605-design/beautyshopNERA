import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { getSiteUrl } from "@/lib/site-url";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

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
    type: "website",
    locale: "fr_FR",
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${outfit.variable} ${cormorant.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
