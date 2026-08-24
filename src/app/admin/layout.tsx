import { requireStaff } from "@/lib/guard";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  return <AdminShell session={session}>{children}</AdminShell>;
}
