import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  await requireStaff("pos.access");
  return children;
}
