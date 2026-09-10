import type { Metadata } from "next";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}