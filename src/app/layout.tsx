import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://nerabeaute.cm"),
  title: "NERA Beauté & Shop",
  description: "Boutique en ligne — beauté, cheveux et mode à Yaoundé. Paiement OM & MoMo. Livraison rapide sous 24h.",
  manifest: "/manifest.webmanifest",
  applicationName: "NERA",
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
