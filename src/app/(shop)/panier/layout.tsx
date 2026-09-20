import type { Metadata } from "next";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMetadata,
  title: "Panier",
};

export default function PrivateShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}