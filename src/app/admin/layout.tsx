import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AdminShell } from "@/components/admin/shell";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const unreadAlerts = await prisma.notification.count({
    where: { isRead: false, OR: [{ userId: null }, { userId: session.userId }] },
  });
  return (
    <AdminShell session={session} unreadAlerts={unreadAlerts}>
      {children}
    </AdminShell>
  );
}
