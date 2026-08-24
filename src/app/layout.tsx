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
  title: "NERA Beauté & Shop",
  description: "Boutique en ligne — beauté, cheveux et mode à Yaoundé, Cameroun",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${outfit.variable} ${cormorant.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
