import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  return <AdminShell session={session}>{children}</AdminShell>;
}
